npx oz push $@
npx oz publish $@
npx truffle compile --all
npx oz create CrowdloanFactory --no-interactive $@
truffle exec ./scripts/deploy/oz.initialize-deploy.js $@
