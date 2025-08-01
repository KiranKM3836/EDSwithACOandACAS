import {
  h, Component, Fragment, render, createRef,
} from '@dropins/tools/preact.js';
import htm from '../product-list-page-custom/htm.js';
import ProductList from '../product-list-page-custom/ProductList.js';
import FacetList from '../product-list-page-custom/FacetList.js';
import { readBlockConfig, sampleRUM } from '../../scripts/aem.js';
import { priceFieldsFragment, performCoreCatalogServiceQuery } from '../../scripts/commerce.js';
import { rootLink } from '../../scripts/scripts.js';
import { fetchSKUsByCategory } from '../../scripts/custom_dropins/commerceBackend/fetchSKUsByCategory.js';

const html = htm.bind(h);

// You can get this list dynamically via attributeMetadata query
export const ALLOWED_FILTER_PARAMETERS = ['page', 'pageSize', 'sort', 'sortDirection', 'q', 'price', 'size', 'color_family', 'activity', 'color', 'gender', 'categories'];
const isMobile = window.matchMedia('only screen and (max-width: 900px)').matches;

const PAGE_SIZE_DESKTOP = 12;
const PAGE_SIZE_MOBILE = 6;
const DEFAULT_PARAMS = {
  basePageSize: isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP,
  page: 1,
  pageSize: isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP,
  sort: 'position',
  sortDirection: 'asc',
};

export const productSearchQuery = (addCategory = false) => `query ProductSearch(
  $currentPage: Int = 1
  $pageSize: Int = 20
  $phrase: String = ""
  $sort: [ProductSearchSortInput!] = []
  $filter: [SearchClauseInput!] = []
  ${addCategory ? '$categoryId: String!' : ''}
) {
  ${addCategory ? `categories(ids: [$categoryId]) {
      name
      urlKey
      urlPath
  }` : ''}
  productSearch(
      current_page: $currentPage
      page_size: $pageSize
      phrase: $phrase
      sort: $sort
      filter: $filter
  ) {
      items {
          productView {
              id
              name
              sku
              urlKey
          }
      }
      total_count
  }
}
`;

async function loadCategory(state) {
  try {
    // Be careful if query exceeds GET size limits, then switch to POST
    const variables = {
      pageSize: state.currentPageSize,
      currentPage: state.currentPage,
      sort: [{
        attribute: state.sort,
        direction: state.sortDirection === 'desc' ? 'DESC' : 'ASC',
      }],
    };

    variables.phrase = state.type === 'search' ? state.searchTerm : '';

    // Always filter for in-stock products
    variables.filter = [{ attribute: 'inStock', eq: 'true' }];

    if (Object.keys(state.filters).length > 0) {
      Object.keys(state.filters).forEach((key) => {
        if (key === 'price') {
          const [from, to] = state.filters[key];
          if (from && to) {
            variables.filter.push({ attribute: key, range: { from, to } });
          }
        } else if (key === 'categories') {
          // For categories, use the 'in' operator with category IDs
          if (state.filters[key] && state.filters[key].length > 0) {
            variables.filter.push({ attribute: 'categoryIds', in: state.filters[key] });
          }
        } else if (state.filters[key].length > 1) {
          variables.filter.push({ attribute: key, in: state.filters[key] });
        } else if (state.filters[key].length === 1) {
          variables.filter.push({ attribute: key, eq: state.filters[key][0] });
        }
      });
    }

    if (state.type === 'category' && state.category.id) {
      variables.categoryId = state.category.id;
      variables.filter = variables.filter || [];
      if (state.category.urlPath) {
        variables.filter.push({ attribute: 'categoryPath', eq: state.category.urlPath });
      } else if (state.category.id) {
        variables.filter.push({ attribute: 'categoryIds', eq: state.category.id });
      }
    }

    window.adobeDataLayer.push((dl) => {
      const requestId = crypto.randomUUID();
      window.sessionStorage.setItem('searchRequestId', requestId);
      const searchInputContext = dl.getState('searchInputContext') ?? { units: [] };
      const searchUnitId = 'livesearch-plp';
      const unit = {
        searchUnitId,
        searchRequestId: requestId,
        queryTypes: ['products', 'suggestions'],
        ...variables,
      };
      const index = searchInputContext.units.findIndex((u) => u.searchUnitId === searchUnitId);
      if (index < 0) {
        searchInputContext.units.push(unit);
      } else {
        searchInputContext.units[index] = unit;
      }
      dl.push({ searchInputContext });
      // TODO: Remove eventInfo once collector is updated
      dl.push({ event: 'search-request-sent', eventInfo: { ...dl.getState(), searchUnitId } });
    });
    
    const responsev1 = await performCoreCatalogServiceQuery(productSearchQuery(state.type === 'category'), variables);
    const SKUs = []
    if(responsev1?.productSearch?.items) {
      responsev1.productSearch.items.map((product)=>{
        SKUs.push(product?.productView?.sku)
    })
    }

    const response = await fetchSKUsByCategory(SKUs)
    console.log(response,"response")

    

    // Parse response into state
    return {
      pages: Math.max(response.productSearch.page_info.total_pages, 1),
      products: {
        items: response.productSearch.items
          .map((product) => ({ ...product.productView, ...product.product }))
          .filter((product) => product !== null),
        total: response.productSearch.total_count,
      },
      category: { ...state.category, ...response.categories?.[0] ?? {} },
      facets: response.productSearch.facets,
    };
  } catch (e) {
    console.error('Error loading products', e);
    return {
      pages: 1,
      products: {
        items: [],
        total: 0,
      },
      facets: [],
    };
  }
}

function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const newState = {
    filters: {},
  };
  params.forEach((value, key) => {
    if (!ALLOWED_FILTER_PARAMETERS.includes(key)) {
      return;
    }

    if (key === 'page') {
      newState.currentPage = parseInt(value, 10) || 1;
    } else if (key === 'pageSize') {
      newState.currentPageSize = parseInt(value, 10) || 12;
    } else if (key === 'sort') {
      newState.sort = value;
    } else if (key === 'sortDirection') {
      newState.sortDirection = value === 'desc' ? 'desc' : 'asc';
    } else if (key === 'q') {
      newState.searchTerm = value;
    } else if (key === 'price') {
      newState.filters[key] = value.split(',').map((v) => parseInt(v, 10) || 0);
    } else if (key === 'categories') {
      // For categories, store the IDs directly from the URL
      newState.filters[key] = value.split(',');
    } else {
      newState.filters[key] = value.split(',');
    }
  });
  return newState;
}

export async function preloadCategory(category) {
  const queryParams = parseQueryParams();
  window.loadCategoryPromise = loadCategory({
    pages: DEFAULT_PARAMS.page,
    currentPage: DEFAULT_PARAMS.page,
    category,
    basePageSize: DEFAULT_PARAMS.basePageSize,
    currentPageSize: DEFAULT_PARAMS.pageSize,
    locale: 'en-US',
    currency: 'USD',
    type: 'category',
    sort: DEFAULT_PARAMS.sort,
    sortDirection: DEFAULT_PARAMS.sortDirection,
    ...queryParams,
  }, []); // Pass empty facets array for initial load
}

function Pagination(props) {
  if (props.loading) {
    return html`<div class="pagination shimmer"></div>`;
  }

  return html`<div class="pagination">
    <div>
      <label for="select-pagesize">Show:</label>
      <select id="select-pagesize" name="pageSize" value=${props.currentPageSize} onChange=${(e) => props.onPageSizeChange?.(parseInt(e.target.value, 10))}>
        ${props.pageSizeOptions.map((size) => html`<option value=${size}>${size} Items</option>`)}
      </select>
    </div>
    <div>
      <label for="select-page">Page:</label>
      <select id="select-page" name="page" value=${props.currentPage} onChange=${(e) => props.onPageChange?.(parseInt(e.target.value, 10))}>
        ${Array(props.pages).fill(0).map((_, i) => html`<option value=${i + 1}>${i + 1}</option>`)}
      </select>
      <span>of ${props.pages}</span>
    </div>
    <div>
      ${props.currentPage > 1 ? html`<button class="previous" onClick=${() => props.onPageChange?.(props.currentPage - 1)}>Previous</button>` : ''}
      ${props.currentPage < props.pages ? html`<button class="next" onClick=${() => props.onPageChange?.(props.currentPage + 1)}>Next</button>` : ''}
    </div>
  </div>`;
}

function Sort(props) {
  const {
    type, disabled, sortMenuRef, onSort,
  } = props;
  const options = [
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Product Name', value: 'name-asc' },
    { label: 'Relevance', value: type === 'category' ? 'position-asc' : 'relevance-desc' },
  ];

  const currentSort = options.find((option) => option.value === `${props.currentSort}-${props.sortDirection}`) || options[3];

  return html`<div class="sort" disabled=${disabled}>
    <button disabled=${disabled}>Sort By: ${currentSort.label}</button>
    <div class="overlay" ref=${sortMenuRef}>
      <button class="close" onClick=${() => sortMenuRef.current.classList.toggle('active')}>Close</button>
      <ul>
        ${options.map((option) => html`<li>
          <a href="#" class="${currentSort.value === option.value ? 'active' : ''}" onClick=${(e) => {
  sortMenuRef.current.classList.toggle('active');
  const [sort, direction = 'asc'] = option.value.split('-');
  onSort?.(sort, direction);
  e.preventDefault();
}}>${option.label}</a>
        </li>`)}
      </ul>
    </div>
  </div>`;
}

class ProductListPage extends Component {
  constructor(props) {
    const {
      type = 'category',
      category,
      urlpath,
    } = props;
    super();

    this.facetMenuRef = createRef();
    this.sortMenuRef = createRef();
    this.secondLastProduct = createRef();

    const queryParams = parseQueryParams();

    let headline = 'Search Results';
    let sort = 'relevance';
    let sortDirection = 'desc';
    if (type === 'category') {
      headline = document.querySelector('.default-content-wrapper > h1')?.innerText;
      sort = 'position';
      sortDirection = 'asc';
    }

    if (type === 'search') {
      sampleRUM('search', { source: '.search-input', target: queryParams.searchTerm });
    }

    this.state = {
      productsLoading: true,
      pages: DEFAULT_PARAMS.page,
      currentPage: DEFAULT_PARAMS.page,
      basePageSize: DEFAULT_PARAMS.basePageSize,
      currentPageSize: DEFAULT_PARAMS.pageSize,
      type,
      category: {
        name: headline,
        id: category || null,
        urlPath: urlpath || null,
      },
      sort,
      sortDirection,
      products: {
        items: [],
        total: 0,
      },
      filters: {},
      facets: [],
      ...queryParams,
    };

    this.filterChange = false;
    this.paginationClick = false;
  }

  setStatePromise(state) {
    return new Promise((resolve) => {
      this.setState(state, resolve);
    });
  }

  static updateQueryParams = (params) => {
    const newParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (!ALLOWED_FILTER_PARAMETERS.includes(key)) {
        return;
      }

      if (params[key] === DEFAULT_PARAMS[key]
        && !new URLSearchParams(window.location.search).has(key)) {
        return;
      }

      if (Array.isArray(params[key]) && params[key].length > 0) {
        newParams.set(key, params[key].join(','));
      } else if (!Array.isArray(params[key]) && params[key]) {
        newParams.set(key, params[key]);
      }
    });

    // Keep existing params that do not interfere with the search
    const curentParams = new URLSearchParams(window.location.search);
    curentParams.forEach((value, key) => {
      if (!ALLOWED_FILTER_PARAMETERS.includes(key)) {
        newParams.set(key, value);
      }
    });

    if (newParams.toString() !== curentParams.toString()) {
      window.history.pushState({}, '', `${window.location.pathname}?${newParams.toString()}`);
    }
  };

  loadState = async (state) => {
    await this.setStatePromise({ ...state, productsLoading: false });
    if (this.state && this.state.products) {
      this.filterChange = false;
      this.paginationClick = false;
    }
    this.props.resolve();

    if (this.state.productsLoading === false) {
      window.adobeDataLayer.push((dl) => {
        const searchResultsContext = dl.getState('searchResultsContext') ?? { units: [] };
        const searchRequestId = window.sessionStorage.getItem('searchRequestId');
        const searchUnitId = 'livesearch-plp';
        const searchResultUnit = {
          searchUnitId,
          searchRequestId,
          products: this.state.products.items.map((p, index) => ({
            name: p.name,
            sku: p.sku,
            url: new URL(rootLink(`/products/${p.urlKey}/${p.sku}`), window.location).toString(),
            imageUrl: p.images?.length ? p.images[0].url : '',
            price: p.price?.final?.amount?.value ?? p.priceRange?.minimum?.final?.amount?.value,
            rank: index,
          })),
          categories: [],
          suggestions: [],
          page: this.state.currentPage,
          perPage: this.state.currentPageSize,
          facets: this.state.facets,
        };
        const index = searchResultsContext.units.findIndex((u) => u.searchUnitId === searchUnitId);
        if (index < 0) {
          searchResultsContext.units.push(searchResultUnit);
        } else {
          searchResultsContext.units[index] = searchResultUnit;
        }
        dl.push({ searchResultsContext });
        dl.push({ event: 'search-response-received', eventInfo: { ...dl.getState(), searchUnitId } });
        if (this.props.type === 'search') {
          dl.push({ event: 'search-results-view', eventInfo: { ...dl.getState(), searchUnitId } });
        } else {
          dl.push({
            categoryContext: {
              name: this.state.category.name,
              urlKey: this.state.category.urlKey,
              urlPath: this.state.category.urlPath,
            },
          });
          dl.push({ event: 'category-results-view', eventInfo: { ...dl.getState(), searchUnitId } });
        }
      });
    }
  };

  loadProducts = async () => {
    this.setState({ productsLoading: true });

    const state = await loadCategory(this.state);
    // Use the new facets from the query response
    await this.loadState({
      ...state,
    });
  };

  async componentDidMount() {
    if (window.loadCategoryPromise) {
      const state = await window.loadCategoryPromise;
      await this.loadState(state);
    } else {
      await this.loadProducts();
    }

    // Special optimization for mobile
    if ('IntersectionObserver' in window && isMobile && this.state.products.items.length === 6 && this.state.products.total > 6) {
      const scrollToBottomObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load products with real page size
            this.setState({ currentPageSize: PAGE_SIZE_DESKTOP, basePageSize: PAGE_SIZE_DESKTOP });
            scrollToBottomObserver.unobserve(entry.target);
          }
        });
      });
      if (this.secondLastProduct.current) {
        scrollToBottomObserver.observe(this.secondLastProduct.current);
      }
    }
  }

  componentDidUpdate(_, prevState) {
    // Update URL
    ProductListPage.updateQueryParams({
      page: this.state.currentPage,
      basePageSize: this.state.basePageSize,
      pageSize: this.state.currentPageSize,
      sort: this.state.sort,
      sortDirection: this.state.sortDirection,
      q: this.state.searchTerm,
      ...this.state.filters,
    });

    // Load new products if filters, pagination or sort have changed
    const diff = Object.keys(Object.keys(prevState).reduce((acc, key) => {
      if (prevState[key] !== this.state[key]) {
        acc[key] = this.state[key];
      }
      return acc;
    }, {}));

    const keysToCheck = ['filters', 'sort', 'sortDirection', 'searchTerm', 'currentPageSize', 'currentPage'];
    if (keysToCheck.some((key) => diff.includes(key))) {
      this.loadProducts();
    }
  }

  onPageChange(page) {
    this.setState({ currentPage: page });
    this.paginationClick = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleFilterChange = async (filters) => {
    const newState = {
      ...this.state,
      filters,
      currentPage: 1, // Reset to first page when filters change
    };

    // Update URL without page refresh
    const params = new URLSearchParams(window.location.search);
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.length > 0) {
        params.set(key, value.join(','));
      } else {
        params.delete(key);
      }
    });
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

    // Update state and reload products
    await this.setStatePromise(newState);
    await this.loadProducts();
  };

  handleSortChange(sort, direction) {
    const newState = { sort, sortDirection: direction };
    if (this.state.currentPageSize === PAGE_SIZE_MOBILE) {
      newState.basePageSize = PAGE_SIZE_DESKTOP;
      newState.currentPageSize = PAGE_SIZE_DESKTOP;
    }
    this.setState(newState);
  }

  render(props, state) {
    const { type = 'category' } = props;

    return html`<${Fragment}>
    <${FacetList}
      facets=${state.facets}
      filters=${state.filters}
      facetMenuRef=${this.facetMenuRef}
      onFilterChange=${this.handleFilterChange}
      loading=${false} />
    <div class="products">
      <div class="title">
        <h1>${state.category.name}</h1>
        ${!state.productsLoading && html`<span>(${state.products.total} ${state.products.total === 1 ? 'Product' : 'Products'})</span>`}
        <${Sort}
          disabled=${state.productsLoading}
          currentSort=${state.sort}
          sortDirection=${state.sortDirection}
          type=${type}
          onSort=${this.handleSortChange.bind(this)}
          sortMenuRef=${this.sortMenuRef} />
      </div>
      <div class="mobile-menu">
        <button disabled=${state.productsLoading} id="toggle-filters" onClick=${() => this.facetMenuRef.current.classList.toggle('active')}>Filters</button>
        <button disabled=${state.productsLoading} id="toggle-sortby" onClick=${() => this.sortMenuRef.current.classList.toggle('active')}>Sort By</button>
      </div>
      <${ProductList}
        products=${state.products}
        secondLastProduct=${this.secondLastProduct}
        loading=${state.productsLoading}
        currentPageSize=${state.currentPageSize} />
      <${Pagination}
        pages=${state.pages}
        currentPage=${state.currentPage}
        pageSizeOptions=${[state.basePageSize, 24, 36]}
        currentPageSize=${state.currentPageSize}
        loading=${state.productsLoading}
        onPageChange=${this.onPageChange.bind(this)}
        onPageSizeChange=${(pageSize) => this.setState({ currentPageSize: pageSize, currentPage: 1 })} />
    </div>
  </>`;
  }
}

export default async function decorate(block) {
  // const config = readBlockConfig(block);

  // block.textContent = '';
  // block.dataset.category = config.category;
  // block.dataset.urlpath = config.urlpath;

  // custom code start
  // Get the category URL path from current location
      // const urlParts = window.location.pathname.split('/');
      // const urlKey = urlParts[urlParts.length - 1]; 

        const { pathname, search } = window.location;

          // 1. Extract slug after `/category/` regardless of depth
          let urlPath = pathname.replace(/^\/|\/$/g, ''); // remove leading/trailing slashes
          if (urlPath.startsWith('catalog/')) {
            urlPath = urlPath.slice('catalog/'.length); // e.g., "test/test"
          }

          // 2. Extract ID from query string (?id=123)
          // const params = new URLSearchParams(search);
          // const categoryId = params.get('id');

      

      // Then pass this dynamically to PLP block
      const config = {
        category: "categoryId",
        urlpath: urlPath,
        type: 'category'
      };

      block.textContent = '';
      block.dataset.category = "categoryId";
      block.dataset.urlpath = urlPath;

      console.log(urlPath,"urlPath")


  //custom code end
  return new Promise((resolve) => {
    const app = html`<${ProductListPage} ...${config} block=${block} resolve=${resolve} />`;
    render(app, block);
  });
}
