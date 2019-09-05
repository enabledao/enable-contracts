npx oz push $@
npx oz publish $@
npx truffle compile --all
npx oz create CrowdloanFactory --no-interactive $@
truffle exec ./deploy-scripts/oz.initialize-deploy.js $@
