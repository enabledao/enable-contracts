import {Contracts} from 'zos-lib';
import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

require('../../setup');
const {deployed} = require('../../../deployed');

// Until I can get this automatically set, must set manually for each network / deployment

const App = Contracts.getFromLocal('App').at(deployed.development.App);

contract('App', async accounts => {
  it('Should load implementations from App', async () => {
    //For each deployed contract, make sure it's address checks out - this should be automated
    let tx = await App.methods.getImplementation('enable-credit', 'TermsContract').call();
    expect(tx).to.be.equal(deployed.development.TermsContract);
  });
});
