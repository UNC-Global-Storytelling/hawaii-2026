import dotenv from 'dotenv';
dotenv.config();

export default function(eleventyConfig) {
  // Let 11ty configure Nunjucks by default, just customize the options
  eleventyConfig.setNunjucksEnvironmentOptions({
    lstripBlocks: true,
    trimBlocks: true,
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