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

## CI Pipeline

[https://circleci.com/gh/enabledao/enable-contracts](https://circleci.com/gh/enabledao/enable-contracts)

## Test solidity coverage

We use [Solidity Coverage](https://github.com/sc-forks/solidity-coverage).
```
$(npm bin)/solidity-coverage
```

## Surya
