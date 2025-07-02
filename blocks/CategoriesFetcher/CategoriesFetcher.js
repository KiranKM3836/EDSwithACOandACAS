import { performCatalogServiceQuery } from '../../scripts/commerce.js';

export default async function decorate(block) {
  block.innerHTML = '';

  const categoryQuery = `
    query {
      categories {
        name
        parentId
        urlPath
      }
    }
  `;

  try {
    const data = await performCatalogServiceQuery(categoryQuery, {}); // Pass empty vars object
    const categories = data?.categories || [];

    if (categories.length === 0) {
      block.innerHTML = '<p>No categories found.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'category-list';

    categories.forEach((category) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      // You won’t have `url_path`, so use name as placeholder
      a.href = '#'; 
      a.textContent = category.name;
      li.appendChild(a);
      ul.appendChild(li);
    });

    block.innerHTML = '';
    block.appendChild(ul);
  } catch (err) {
    console.error('Error fetching categories:', err);
    block.innerHTML = '<p>Failed to load categories.</p>';
  }
}
