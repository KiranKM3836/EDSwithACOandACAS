import { performCoreCatalogServiceQuery } from '../../scripts/commerce.js';

export default async function decorate(block) {
  block.innerHTML = '';

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
    const data = await performCoreCatalogServiceQuery(categoryQuery, {}); // Pass empty vars object
    const categories = data?.categories || [];
    const idsToRemove = ['2'];
    const filteredCategories = categories.filter(category => !idsToRemove.includes(category.id));

    if (filteredCategories.length === 0) {
      block.innerHTML = '';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'category-list';

    filteredCategories.forEach((category) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      // You won’t have `url_path`, so use name as placeholder
      a.href = `/catalog/${category.urlPath}`; 
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
