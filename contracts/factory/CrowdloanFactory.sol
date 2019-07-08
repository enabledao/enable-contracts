pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "../crowdloan/Crowdloan.sol";
import "../debt-contracts/RepaymentRouter.sol";
import "../debt-contracts/TermsContract.sol";
import "../debt-token/DebtToken.sol";

contract CrowdloanFactory is Initializable {
    string constant ENABLE_CREDIT_PACKAGE = "enable-credit";
    string constant TERMS_CONTRACT = "TermsContract";
    string constant CROWDLOAN = "Crowdloan";
    string constant DEBT_TOKEN = "DebtToken";
    string constant REPAYMENT_ROUTER = "RepaymentRouter";

    App public app;

    event LoanCreated(
        address indexed borrower,
        uint256 indexed amount,
        address termsContract,
        address crowdloan,
        address debtToken,
        address repaymentRouter
    );

    function initialize (address _appContractAddress) public initializer {
      app = App(_appContractAddress);
    }

    function _createTermsContract(bytes memory _data) public returns (address proxy) {
      address admin = msg.sender;
      return address(app.create(ENABLE_CREDIT_PACKAGE, TERMS_CONTRACT, admin, _data));
    }

    function _createCrowdloan(bytes memory _data) public returns (address proxy) {
      address admin = msg.sender;
      return address(app.create(ENABLE_CREDIT_PACKAGE, CROWDLOAN, admin, _data));
    }

    function _createDebtToken(bytes memory _data) public returns (address proxy) {
      address admin = msg.sender;
      return address(app.create(ENABLE_CREDIT_PACKAGE, DEBT_TOKEN, admin, _data));
    }

    function _createRepaymentRouter(bytes memory _data) public returns (address proxy) {
      address admin = msg.sender;
      return address(app.create(ENABLE_CREDIT_PACKAGE, REPAYMENT_ROUTER, admin, _data));
    }

    /// @param loanParams Array of loan parameters
    //     [0] _principal,
    //     [1] _amortizationUnitType,
    //     [2] _termLength,
    //     [3] _termPayment,
    //     [4] _gracePeriodLength,
    //     [5] _gracePeriodPayment,
    //     [6] _interestRate,
    //     [7] _crowdfundLength,
    //     [8] _crowdfundStart
    function deploy(
        address _principalTokenAddr,
        uint256[9] memory loanParams
    ) public {
        // TODO(Dan): Asserts and require statements

        address termsContractInstance = _createTermsContract("");
        address debtTokenInstance = _createDebtToken("");
        address crowdloanInstance = _createCrowdloan("");
        address repaymentRouterInstance = _createRepaymentRouter("");

        // address(uint160(addr))

        TermsContract(termsContractInstance).initialize(
            _principalTokenAddr,
            loanParams[0],
            loanParams[1],
            loanParams[2],
            loanParams[3],
            loanParams[4],
            loanParams[5],
            loanParams[6]
        );

        DebtToken(debtTokenInstance).initialize(
            "EnableDebtToken",
            "EDT"
        );

        Crowdloan(address(uint160(crowdloanInstance))).initialize(
            debtTokenInstance,
            loanParams[7],
            loanParams[8]
        );

        RepaymentRouter(repaymentRouterInstance).initialize(
            address(uint160(crowdloanInstance)),
            debtTokenInstance
        );

        emit LoanCreated(
            msg.sender,
            loanParams[0],
            termsContractInstance,
            debtTokenInstance,
            crowdloanInstance,
            repaymentRouterInstance
        );

        // return (
        //     termsContractInstance,
        //     debtTokenInstance,
        //     crowdloanInstance,
        //     repaymentRouterInstance
        // );
    }
}
