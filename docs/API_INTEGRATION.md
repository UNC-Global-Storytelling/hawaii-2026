# Connecting Your 11ty Frontend to Directus

This guide explains how to fetch and display content from Directus in your 11ty website.

## What You're Building

Right now you have Directus storing content. Now you want your 11ty frontend to display it. The flow:

1. You create a collection in Directus (e.g., "Blog Posts")
2. Add a few articles in the admin panel
3. During your 11ty build, JavaScript fetches those articles from the Directus API
4. Your HTML is generated with the content embedded
5. When someone visits your site, they see the articles (pre-generated, super fast)

## Prerequisites

Before you start, make sure:

- [ ] Directus is running and accessible (`oc get route directus`)
- [ ] You have created at least one collection in Directus
- [ ] You have added some test data to that collection

If any of these are missing, go back to [SETUP.md](SETUP.md) and complete them.

## Step 1: Enable Public Read Access

Our Directus instance now exposes read-only collections through the **Public** role, so the 11ty build can pull content without shipping a private API token.

**In Directus Admin Panel:**

1. Go to https://<your-directus-route>/admin
2. Click your profile icon (top right)
3. Go to **Settings** → **Access Control** → **Roles**
4. Select **Public** (or whichever role backs anonymous access)
5. For each collection that should feed the static site, set permission to **Read** only

That’s it—no per-client tokens required. The only environment variable you need locally is the API URL:

```bash
DIRECTUS_API_URL=https://directus-xxxxx.apps.yourcluster.com
```

> Need to hide content? Create a separate locked-down role and token, then follow the optional token steps noted later in this guide.

## Step 2: Create a Directus Data Source

In 11ty, "data files" are special JavaScript files that fetch data during the build process. Let's create one for Directus.

**Create this file:** `src/_data/directus.js`

```javascript
// src/_data/directus.js
export default async function() {
  const apiUrl = process.env.DIRECTUS_API_URL;
  const apiToken = process.env.DIRECTUS_API_TOKEN;

  // If not configured, return empty object
  // (useful for local development)
  if (!apiUrl) {
    console.warn('⚠️  Directus API URL not configured');
    console.warn('   Add DIRECTUS_API_URL to your .env file');
    return {};
  }

  // Helper function to fetch any collection
  async function fetchCollection(collection, options = {}) {
    const queryParams = new URLSearchParams(options);

    const headers = apiToken
      ? { Authorization: `Bearer ${apiToken}` }
      : undefined;

    try {
      const queryString = queryParams.toString();
      const response = await fetch(
        `${apiUrl}/items/${collection}${queryString ? `?${queryString}` : ''}`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${collection}: ${response.status} ${response.statusText}`
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error(`❌ Error fetching from Directus:`, error.message);
      return { data: [] };  // Return empty array on error
    }
  }

  return {
    // Export the helper function so you can call it from templates
    fetch: fetchCollection,
    // Also export the base URL for constructing image URLs
    url: apiUrl
  };
}
```

## Step 3: Use It in Your Templates

Now you can call your Directus data from any 11ty template. Here are different ways to use it:

### In Nunjucks Templates (.njk)

```nunjucks
{# Inside any .njk file #}
{% set articles = directus.fetch('articles') %}

<h1>Articles</h1>

{% if articles.data %}
  {% for article in articles.data %}
    <article>
      <h2>{{ article.title }}</h2>
      <p>{{ article.description }}</p>
      <a href="/articles/{{ article.slug }}/">Read more</a>
    </article>
  {% endfor %}
{% else %}
  <p>No articles yet.</p>
{% endif %}
```

### In Markdown with Nunjucks

```markdown
---
title: Blog
layout: blog-layout.njk
---

# Latest Articles

{% set articles = directus.fetch('articles') %}

{% for article in articles.data %}
  - [{{ article.title }}](/articles/{{ article.slug }}/)
{% endfor %}
```

### With Filtering

Directus supports filtering. Here's how to request only published articles:

```nunjucks
{% set published = directus.fetch('articles', {
  filter: JSON.stringify({ status: { _eq: 'published' } })
}) %}
```

### With Sorting

```nunjucks
{# Newest articles first #}
{% set newest = directus.fetch('articles', {
  sort: '-date_created',
  limit: 10
}) %}
```

### With Specific Fields Only

```nunjucks
{# Only fetch the fields you need (faster) #}
{% set articles = directus.fetch('articles', {
  fields: 'title,slug,excerpt,cover_image'
}) %}
```

## Step 4: Handle Images

If you have images stored in Directus, you can reference them:

```nunjucks
{% set article = directus.fetch('articles').data[0] %}

{% if article.cover_image %}
  <img 
    src="{{ directus.url }}/assets/{{ article.cover_image }}"
    alt="{{ article.title }}"
  />
{% endif %}
```

For better image optimization, add width and height:

```html
<img 
  src="{{ directus.url }}/assets/{{ article.cover_image }}?width=800&quality=80"
  alt="{{ article.title }}"
/>
```

## Step 5: Create a Dynamic Collection Page

Want to generate a page for each article? You can do that too!

**In your `eleventy.config.js`:**

```javascript
export default async function(eleventyConfig) {
  
  // Create a collection from Directus data
  eleventyConfig.addCollection("articles_from_directus", async () => {
    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;
    
    if (!apiUrl) {
      console.warn('Skipping Directus collection - DIRECTUS_API_URL missing');
      return [];
    }

    try {
      const response = await fetch(
        `${apiUrl}/items/articles`,
        apiToken ? { headers: { Authorization: `Bearer ${apiToken}` } } : undefined
      );
      const data = await response.json();
      
      // Transform Directus data into 11ty collection format
      return data.data.map(article => ({
        ...article,
        url: `/articles/${article.slug}/`,
        layout: 'article.njk',  // Your template
        tags: ['article']
      }));
    } catch (error) {
      console.error('Failed to load articles from Directus:', error);
      return [];
    }
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
};
```

Then in `src/articles.njk`:

```nunjucks
---
layout: article.njk
permalink: /articles/{{ slug }}/
---

<h1>{{ title }}</h1>
<article>
  {{ content }}
</article>
```

## Step 6: Test Your Setup

### Test Locally

Before deploying, test that the connection works:

```bash
# Make sure your .env has the values
echo "API URL: $DIRECTUS_API_URL"

# Build your 11ty site
npm run build

# Check if content appeared in the generated HTML
grep "your-article-title" _site/index.html
```

### Common Issues

**"Directus API not configured"**
- Check that `.env` has `DIRECTUS_API_URL`
- Verify the URL is correct (include the full domain)

**"Failed to fetch articles"**
- Check that Directus is running: `oc get pod -l app=directus`
- Check that your collection name is correct
- If you added a custom token, confirm its role still has read access

**"No data appears in HTML"**
- Check 11ty's build output for errors
- Manually test the API: `curl "https://directus.com/api/items/articles"`
- Make sure you have actually created items in the collection

## Advanced: Caching Data

If you have lots of content, fetching during every build might be slow. You can cache:

```javascript
// src/_data/directus.js with caching
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 15;  // 15 minutes

export default async function() {
  const apiUrl = process.env.DIRECTUS_API_URL;
  const apiToken = process.env.DIRECTUS_API_TOKEN;

  if (!apiUrl) return {};

  async function fetchCollection(collection, options = {}) {
    const cacheKey = `${collection}-${JSON.stringify(options)}`;
    const cached = cache.get(cacheKey);

    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Using cached data for ${collection}`);
      return cached.data;
    }

    // Fetch fresh data...
    const queryParams = new URLSearchParams(options);

    try {
      const queryString = queryParams.toString();
      const response = await fetch(
        `${apiUrl}/items/${collection}${queryString ? `?${queryString}` : ''}`,
        apiToken ? { headers: { Authorization: `Bearer ${apiToken}` } } : undefined
      );
      const data = await response.json();
      
      // Cache it
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${collection}:`, error.message);
      return { data: [] };
    }
  }

  return {
    fetch: fetchCollection,
    url: apiUrl
  };
}
```

## Environment-Specific Configuration

Different environments might have different Directus instances:

```bash
# In .env.production
DIRECTUS_API_URL=https://directus.yoursite.com

# In .env.development (local testing)
DIRECTUS_API_URL=http://localhost:8055
```

Then reference them in your code:

```javascript
const apiUrl = process.env.DIRECTUS_API_URL || 'http://localhost:8055';
```

## Complete Example

Here's a complete example using all the concepts above:

**src/_data/blog.js**
```javascript
export default async function() {
  const apiUrl = process.env.DIRECTUS_API_URL;
  const apiToken = process.env.DIRECTUS_API_TOKEN;

  if (!apiUrl) {
    console.warn('Blog data source not configured');
    return { posts: [] };
  }

  try {
    const response = await fetch(
      `${apiUrl}/items/blog_posts?` +
      `filter=${encodeURIComponent(JSON.stringify({ status: { _eq: 'published' } }))}&` +
      `sort=-date_published&` +
      `fields=id,title,slug,excerpt,date_published,author`,
      apiToken ? { headers: { Authorization: `Bearer ${apiToken}` } } : undefined
    );
    
    const data = await response.json();
    
    return {
      posts: data.data || [],
      url: apiUrl
    };
  } catch (error) {
    console.error('Failed to load blog posts:', error);
    return { posts: [] };
  }
}
```

**src/_includes/layouts/blog.njk**
```nunjucks
---
layout: base.njk
---

<h1>Blog</h1>

{% if blog.posts.length > 0 %}
  <div class="posts">
    {% for post in blog.posts %}
      <article class="post">
        <h2><a href="/blog/{{ post.slug }}/">{{ post.title }}</a></h2>
        <time>{{ post.date_published | dateFilter }}</time>
        <p>{{ post.excerpt }}</p>
      </article>
    {% endfor %}
  </div>
{% else %}
  <p>No blog posts yet.</p>
{% endif %}

{{ content | safe }}
```

## Debugging Tips

Having trouble? Add some debugging to your data source:

```javascript
export default async function() {
  const apiUrl = process.env.DIRECTUS_API_URL;
  const apiToken = process.env.DIRECTUS_API_TOKEN;

  console.log('🔍 Directus Debug Info:');
  console.log(`   URL: ${apiUrl}`);
  console.log(`   Token present: ${apiToken ? 'Yes' : 'No'}`);
  
  // ... rest of code
}
```

Then run your build and check the console output:

```bash
npm run build 2>&1 | grep "Directus Debug"
```

---

Next: Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you hit any issues, or [SETUP.md](SETUP.md) to go back.
