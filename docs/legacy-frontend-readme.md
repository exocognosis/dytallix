# Legacy Frontend README

This file contains references to the previous detailed frontend documentation that was in the main README.md before the repository standardization.

## Retrieving Previous Documentation

To access the previous comprehensive frontend documentation with detailed component descriptions, project structure details, and deployment information, use the following git commands:

```bash
# View the README.md from the previous commit
git show HEAD~1:dytallix-lean-launch/README.md

# Or view the diff to see what was changed
git diff HEAD~1 HEAD -- dytallix-lean-launch/README.md

# Save the previous version to a file for reference
git show HEAD~1:dytallix-lean-launch/README.md > docs/previous-readme-content.md
```

## Migration Notes

The previous README.md contained detailed information about:
- Complete React component structure
- Detailed project file organization
- Configuration examples
- Deployment guides
- Development guidelines

This content has been restructured to focus on the mv-testnet workstream and repository standardization. The technical implementation details remain valid but are now organized under the new directory structure.

## Current Structure Reference

For current frontend implementation details, refer to:
- Source code in `src/` directory
- Component documentation in `src/components/`
- Configuration files (`package.json`, `vite.config.js`)
- Environment setup in `.env.example`