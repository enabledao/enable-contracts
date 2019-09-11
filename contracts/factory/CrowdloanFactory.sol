pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";
import "../crowdloan/Crowdloan.sol";
import "../debt-contracts/RepaymentManager.sol";
import "../debt-contracts/TermsContract.sol";

contract CrowdloanFactory is Initializable {
    string constant ENABLE_CREDIT_PACKAGE = "enable-credit";
    string constant TERMS_CONTRACT = "TermsContract";
    string constant CROWDLOAN = "Crowdloan";
    string constant REPAYMENT_ROUTER = "RepaymentManager";

    App public app;

    event LoanCreated(
        address indexed borrower,
        uint256 indexed amount,
        address termsContract,
        address crowdloan,
        address repaymentManager
    );

    function initialize(address _appContractAddress) public initializer {
        app = App(_appContractAddress);
    }

    function _createTermsContract(bytes memory _data) internal returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, TERMS_CONTRACT, admin, _data));
    }

    function _createCrowdloan(bytes memory _data) internal returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, CROWDLOAN, admin, _data));
    }

    function _createRepaymentManager(bytes memory _data) internal returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, REPAYMENT_ROUTER, admin, _data));
    }

    function deploy(
        address principalToken,
        uint256 principalRequested,
        uint256 loanPeriod,
        uint256 interestRate,
        uint256 minimumRepayment,
        uint256 maximumRepayment,
        uint256 crowdfundLength,
        uint256 crowdfundStart
    ) public {
        // TODO(Dan): Asserts and require statements

        address termsContractInstance = _createTermsContract("");
        address crowdloanInstance = _createCrowdloan("");
        address repaymentManagerInstance = _createRepaymentManager("");

        // address(uint160(addr))

        address[] memory controllers = new address[](2);
        controllers[0] = crowdloanInstance;
        controllers[1] = repaymentManagerInstance;

        address[] memory loanInstanceAsController = new address[](1);
        loanInstanceAsController[0] = crowdloanInstance;

        TermsContract(termsContractInstance).initialize(
            msg.sender,
            principalToken,
            principalRequested,
            loanPeriod,
            interestRate,
            minimumRepayment,
            maximumRepayment,
            controllers
        );

        Crowdloan(address(uint160(crowdloanInstance))).initialize(
            termsContractInstance,
            repaymentManagerInstance,
            crowdfundLength,
            crowdfundStart
        );

        RepaymentManager(address(uint160(repaymentManagerInstance))).initialize(
            termsContractInstance,
            loanInstanceAsController
        );

        emit LoanCreated(
            msg.sender,
            principalRequested,
            termsContractInstance,
            crowdloanInstance,
            repaymentManagerInstance
        );
    }
}
