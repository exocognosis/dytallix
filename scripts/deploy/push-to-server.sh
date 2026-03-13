#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Formatting and preparing current code for Server Deployment...${NC}"

# 1. Update your local code with any remote changes first to prevent conflicts
echo -e "\n${BLUE}[1/4] Pulling latest changes from remote...${NC}"
git pull origin main --rebase || echo -e "⚠️  No remote connection or branch mismatch. Skipping pull."

# 2. Add all new and modified files
echo -e "\n${BLUE}[2/4] Staging all files...${NC}"
git add .

# 3. Commit the changes
# If the user passed a message like `./push-to-server.sh "fixed the UI"`, use it. 
# Otherwise use a default message.
COMMIT_MSG=${1:-"Update application and trigger GitHub deployment pipeline"}

echo -e "\n${BLUE}[3/4] Committing changes with message: \"$COMMIT_MSG\"...${NC}"
git commit -m "$COMMIT_MSG" || echo -e "⚠️  No changes to commit. Proceeding to push anyway..."

# 4. Push to remote 'main' branch to trigger the action
echo -e "\n${BLUE}[4/4] Pushing code to trigger Hetzner deployment...${NC}"
# We assume 'main' is the branch that triggers the pipeline
# The command below forces the push of the current branch to 'main' on the remote
git push origin HEAD:main

echo -e "\n${GREEN}✅ Success! Code has been sent to GitHub!${NC}"
echo -e "👉 The Hetzner server is currently downloading and spinning up the latest code."
echo -e "You can monitor the deployment progress at: https://github.com/HisMadRealm/dytallix/actions"
