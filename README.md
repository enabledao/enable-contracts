# Enable Stablecoin Loan Kit

Enable is a **open source stablecoin loan kit** that enables anyone to deploy a fullly functional peer-to-peer stablecoin loan with the following features:

1. Immutable record of loan agreement and automatic tracking of repayments and defaults
2. Out-of-the-box handling of crowdfunding and fractional ownership through loan shares
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

1. `npm run test`. This also runs `zos push`, which updates the contracts with the latest vrsions

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

# Troubleshooting

## Common errors

### Cannot read property `address`

```javascript
// Example
> npm t
TypeError: Cannot read property 'address' of undefined
```

This happens because zos needs contracts to be `published`. To resolve, run:

```
zos publish
zos publish --network development
```


# Terminology

## Persons

1. Lender: lends to a loan
2. Borrower: person who loan is disbursed to

## Nouns

1. Loan Shares: fractional ownership in a loan
2. Funding Goal: this is same as `principalRequested` from the borrower's point of view
3. Total Crowdfunded: this is the amount raised in the crowdfund
4. Principal Requested: the loan amount the borrower is requesting for
5. Principal Disbursed: the amount
6. Donations: "unauthorized" native ERC-20 transfers to smart contract

## Actions

1. Fund: lenders fund a loan

## Stages and Outcomes

We need a set of (Mutually Exclusive, Collectively Exhaustive)[https://www.caseinterview.com/mece] stages and outcomes, that are used for our `require` checks.

Some possible scenarios we will need to 'describe':

**Scenario 1:**
Crowdfund has ended, but `borrower` does not withdraw funds. If they do not `start` loan within a certain period of time (e.g. 48 hours), lenders should be able to `refund`.

Stage: `crowdfund ended`
Crowdfund Outcome: `no outcome yet` -> `crowdfund refunded`

**Scenario 2:**
Crowdfund has ended, and `borrower` decides they do not want the loan and wants to refund the money.

Stage: `crowdfund ended`
Crowdfund Outcome: `crowdfund refunded`

**Scenario 3:**
During crowdfund, `borrower` decides to pause the crowdfund. The `crowdloan`:`fund` should be suspended.

Stage: `crowdfund started`
Crowdfund Outcome: `no outcome yet` -> `crowdfund paused`

### Stages

These steps are sequential. `require` statements can use `<` of `<=` to test for stages

1. crowdfund notStarted
2. crowdfund started
3. crowdfund ended (either early end by borrower, or hit goal)
4. loan started and in repayment cycle (this can mean that it's in default)
5. completed (i.e. either fully paid back or written off)

### Crowdfund Outcomes (pertains to _outcome_ of crowdfund)

1. no outcome yet (in progress, or pending acceptance)
2. crowdfund paused (not implemented)
3. crowdfund ended
4. crowdfund refunded (i.e. borrower rejects the crowdfund, returns money)
5. crowdfund accepted (i.e. borrower starts the loan)

### Loan Outcomes (pertains to _outcome_ of loan)

1. On time (not fully paid back yet)
2. Late 30, 60, 90, 180 (number of days it's behind in loans)
3. Fully paid back
4. Written off (default)
