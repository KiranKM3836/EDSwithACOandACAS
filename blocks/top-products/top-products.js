import { readBlockConfig } from '../../scripts/aem.js';
import { rootLink } from '../../scripts/scripts.js';
import { performCatalogServiceQuery } from '../../scripts/commerce.js';

const query = `query TopProducts($categoryId: String!, $pageSize: Int!) {
  productSearch(
    phrase: ""
    current_page: 1,
    page_size: $pageSize,
    filter: [
      { attribute: "inStock", eq: "true" },
      { attribute: "categoryIds", eq: $categoryId }
    ]
  ) {
    items {
      productView {
        id
        name
        sku
        urlKey
        images(roles: "thumbnail") {
          url
        }
        ... on SimpleProductView {
          price {
            final {
              amount {
                value
              }
            }
          }
        }
        ... on ComplexProductView {
          priceRange {
            minimum {
              final {
                amount {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
}`;




export default async function decorate(block) {
  const config = readBlockConfig(block);
  const categoryId = config.category;
  const categoryTitle = config.title || 'No Title';

  if (!categoryId) {
    block.textContent = 'Missing category config';
    return;
  }


  block.innerHTML = `<h2 class="title">${categoryTitle}</h2>
    <div class="scrollable">
      <div class="product-grid"></div>
    </div>`;

  const grid = block.querySelector('.product-grid');

  const variables = {
    categoryId,
    pageSize: 8,
  };

  try {
    const res = await performCatalogServiceQuery(query, variables);
    const products = res?.productSearch?.items || [];

    if (!products.length) {
      block.textContent = 'No products found.';
      return;
    }

    products.slice(0, 5).forEach(({ productView }) => {
  const image = productView.images?.[0]?.url || '';
  const name = productView.name;
  const url = rootLink(`/products/${productView.urlKey}/${productView.sku}`);
  const price = productView.price?.final?.amount?.value ??
                productView.priceRange?.minimum?.final?.amount?.value ?? 'N/A';

  const item = document.createElement('div');
  item.className = 'product-grid-item';

  item.innerHTML = `
    <a href="${url}" class="card-link">
      <div class="card-image-wrapper">
        <picture>
          <source type="image/webp" srcset="${image}?width=300&format=webply&optimize=medium" />
          <img loading="lazy" alt="${name}" src="${image}?width=300&format=jpg&optimize=medium" />
        </picture>
      </div>
      <div class="card-title">
        ${name}
        <div class="card-price">$${price}</div>
      </div>
    </a>
  `;

  grid.appendChild(item);
      });

      // 👉 CTA Card (Go To Arrow)
      const cta = document.createElement('div');
      cta.className = 'product-grid-item cta-card';
      cta.innerHTML = `
        <a href="${rootLink(`/category/${categoryId}`)}" class="card-link">
          <div class="go-icon">→</div>
          <div class="card-title">Go to Category</div>
        </a>
      `;
      grid.appendChild(cta);

  } catch (e) {
    console.error('Failed to load top products', e);
    block.textContent = 'Error loading products.';
  }
}
