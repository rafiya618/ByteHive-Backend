export const ruleValidate = (post) => {
  let passed = true;
  const issues = [];

  if (post.post_title.length < 5) {
    passed = false;
    issues.push("Title too short");
  }

  if (post.post_description.length < 20) {
    passed = false;
    issues.push("Content too short");
  }

  if (!post.category) {
    passed = false;
    issues.push("Missing category");
  }

  return {
    passed,
    issues
  };
};
