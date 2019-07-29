npx zos push $@
npx zos publish $@
npx truffle compile
npx zos create CrowdloanFactory --no-interactive $@
truffle exec ./zos.initialize-deploy.js $@
