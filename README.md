# Enable Stablecoin Loan Kit

Enable is a **open source stablecoin loan kit** that enables anyone to deploy a fullly functional peer-to-peer stablecoin loan with the following features:

1. Immutable record of loan agreement and automatic tracking of repayments and defaults
2. Out-of-the-box handling of crowdfunding and fractional ownership through debt tokens
3. Automatic routing of repayments to fractional owners

We built Enable with the vision to expand opportunity to emerging market borrowers through access to credit, to fund value-creating activities like education and starting a business.

## Design Philosophy

The Enable stablecoin loan kit is standalone, and designed with minimum viable complexity in mind.

It is heavily inspired by the OpenZeppelin Crowdfund contracts and Dharma's loan contracts.

## Components

The Crowdloan functionality has been decomposed into the following categories:

- **Crowdloan**: Track state of crowdfund, collect funds from lenders, and issue debt tokens. Once the funding is complete the borrower can withdraw funds. If the loan fails to get fully funded, lenders can withdraw their contribution.

- **RepaymentRouter**: Handle repayments, and track withdrawal allowances for debt token holders.

- **TermsContract**: Get information about the terms of the loan and it's current status.

## Future Plans

We believe parts of this project could morph into generic standards useful to theEthereum community. We'll be expanding, modularizing, and genercizing as appropriate when the initial implementation is finished.

# Developer Instructions

## CI Pipeline

[https://circleci.com/gh/enabledao/enable-contracts](https://circleci.com/gh/enabledao/enable-contracts)

## `zos` workflow for local development

We use [ZeppelinOS](https://docs.zeppelinos.org/docs/start.html) to develop, deploy and operate the Enable loan kit packages. The [ZeppelinOS Documentation](https://docs.zeppelinos.org/docs/start.html) is a good start.

### Setup

1. Run `npm install` to install all zeppelinOS related dependencies
2. Run `ganache-cli` (or `ganache-cli --deterministic`) to run a local blockchain
3. Create your own `.env` file based on `.env.sample`. These are the `process.env` variables that will be used for deployment / application.

### Deploy to ganache `development` network

For background: read [Publishing an EVM package](https://docs.zeppelinos.org/docs/publishing.html).

1. `zos publish --network development`. This publishes the project's app, package and provider. This updates the [zos config](https://docs.zeppelinos.org/docs/configuration.html) file with "app.address" field that is needed for tests to run.
2. `zos push --network development`. This deploys the contracts in the project. This has the same effect as running `zos create` on every contract. See [Quickstart](https://docs.zeppelinos.org/docs/first.html) for context.

### Running tests

1. `npm run test`. Also runs `zos push` (Dan: does it upgrade contracts as well?)

### Upgrading contracts

For background: read [Upgrading contracts](https://docs.zeppelinos.org/docs/first.html#upgrading-your-contract)

1. `zos upgrade <contract name>` or `zos upgrade --all` based on contract changed. This should upgrade the contracts.

## Editor setup

We use ESLint and Prettier to format our code. Please make sure you have the following setting turned on in VSCode (or equivalent editor).

```
editor.formatOnSave: true
```

## Test solidity coverage

We use [Solidity Coverage](https://github.com/sc-forks/solidity-coverage).

```
$(npm bin)/solidity-coverage
```
