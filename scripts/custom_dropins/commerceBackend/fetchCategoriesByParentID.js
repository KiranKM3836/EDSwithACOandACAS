import { performCatalogServiceQuery } from "../../../scripts/commerce.js";

export default async function fetchCategoriesByParentID(parentID) {
  const categoryQuery = `
      query {
        categories {
          id
          name
          parentId
          urlPath
        }
      }
  `;

  try {
    const data = await performCatalogServiceQuery(categoryQuery, {}); // No variables needed
    const allCategories = data?.categories || [];

    const filteredCategories = allCategories.filter(
      (cat) => Number(cat.parentId) === Number(parentID)
    );

    return filteredCategories;
  } catch (err) {
    console.error("Error fetching categories:", err);
    return [];
  }
}
