import { performCatalogServiceQuery } from '../../commerce.js';


const productSearchQueryACO =()=>`query productSearch(
  $phrase: String!
  $filter: [SearchClauseInput!]
  $pageSize: Int
  $currentPage: Int
) {
  productSearch(
    phrase: $phrase
    filter: $filter
    page_size: $pageSize
    current_page: $currentPage
  ) {
    total_count
    items {
      ...ProductView
    }
    page_info {
      current_page
      page_size
      total_pages
    }
  }
}

fragment ProductView on ProductSearchItem {
  productView {
    __typename
    sku
    name
    url
    urlKey
    inStock
    images {
      label
      url
      roles
    }
    ... on SimpleProductView {
      price {
        final { amount { value currency } }
        regular { amount { value currency } }
      }
    }
    ... on ComplexProductView {
      priceRange {
        maximum {
          final { amount { value currency } }
          regular { amount { value currency } }
        }
        minimum {
          final { amount { value currency } }
          regular { amount { value currency } }
        }
      }
      options {
        id
        title
        values {
          title
          ... on ProductViewOptionValueSwatch {
            id
            inStock
            type
            value
          }
        }
      }
    }
  }
}
`

export const  fetchSKUsByCategory = async (skus) =>{

    const aCOVariables = {
                                "phrase": "*",
                                "pageSize": 10,
                                "currentPage": 1,
                                "filter": [
                                    {
                                    "attribute": "sku",
                                    "in": skus
                                    },
                                    {
                                    "attribute": "visibility",
                                    "in": ["Search", "Catalog, Search"]
                                    }
                                ]
                                }
    const productsData = await performCatalogServiceQuery(productSearchQueryACO(), aCOVariables)

    return productsData

}
