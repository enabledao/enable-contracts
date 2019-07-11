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

# Contribute

We use [ZeppelinOS](https://docs.zeppelinos.org/docs/start.html) to develop, deploy and operate the Enable loan kit packages. The [ZeppelinOS Documentation](https://docs.zeppelinos.org/docs/start.html) is a good start.

## Running enable-contracts locally (`development` environment)

### Setup

1. Run `npm install` to install all zeppelinOS related dependencies
2. Run `ganache-cli` or `ganache-cli --deterministic` to run a local blockchain
3. Create your own `.env` file based on `.env.sample`. These are the `process.env` variables that will be used for deployment / application.

### Deploying contracts using zos

1. Run `zos create` which runs the deployment CLI. Read the [Quickstart](https://docs.zeppelinos.org/docs/first.html) for context
2. When presented with the CLI, choose the `development` network
3. Deploy the master `crowdloanFactory` contract. This should also deploy the remaining contracts

```
> zos create
/// Sample output
Nothing to compile, all contracts are up to date.
? Pick a contract to instantiate CrowdloanFactory
? Pick a network development
✓ Contract Crowdloan deployed
✓ Contract DebtToken deployed
✓ Contract RepaymentRouter deployed
✓ Contract TermsContract deployed
✓ Contract CrowdloanFactory deployed
✓ Contract DebtManager deployed
All contracts have been deployed
? Do you want to call a function on the instance after creating it? No
Possible initialization method (initialize) found in contract. Make sure you initialize your instance.
✓ Setting everything up to create contract instances
✓ Instance created at 0xe982E462b094850F12AF94d21D470e21bE9D0E9C
0xe982E462b094850F12AF94d21D470e21bE9D0E9C
```

```
zos create
```

## Test

The build & deploy process is similar to truffle, with these changes:

```
zos publish
```

To initialize local environment

```
zos push
```

To compile & deploy logic contracts to local network

```
npm run test
```

To run truffle tests

## Editor setup

We use ESLint and Prettier to format our code. Please make sure you have the following setting turned on in VSCode (or equivalent editor).

```
editor.formatOnSave: true
```

## CI Pipeline

[https://circleci.com/gh/enabledao/enable-contracts](https://circleci.com/gh/enabledao/enable-contracts)

## Test solidity coverage

We use [Solidity Coverage](https://github.com/sc-forks/solidity-coverage).

```
$(npm bin)/solidity-coverage
```
