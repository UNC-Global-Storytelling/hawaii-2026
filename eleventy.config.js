// Load .env for local development (skipped in production where vars are injected)
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch {}

export default function(eleventyConfig) {
  // Let 11ty configure Nunjucks by default, just customize the options
  eleventyConfig.setNunjucksEnvironmentOptions({
    lstripBlocks: true,
    trimBlocks: true,
  });

  eleventyConfig.addPassthroughCopy({
    "src/assets": "assets",
    "src/css": "css",
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
      data: "_data"
    }
  }
}