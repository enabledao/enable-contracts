# Enable Contracts
The Crowdloan implementation is heavily inspired by OpenZeppelin crowdfund and Dharma.

It's standalone, and designed with the minimum viable complexity in mind.

### Components
**Crowdloan**: Track state of crowdfund, collect funds from lenders, and issue debt tokens. Once the funding is complete the borrower can withdraw funds. If the loan fails to get fully funded, lenders can withdraw their contribution.

**RepaymentRouter**: Handle repayments, and track withdrawal allowances for debt token holders.

**TermsContract**: Get information about the terms of the loan and it's current status.


### Future Plans
We believe parts of this project could morph into generic standards useful to Ethereum community. We'll be expanding, modularizing, and genercizing as appropriate when the initial implementation is finished. 