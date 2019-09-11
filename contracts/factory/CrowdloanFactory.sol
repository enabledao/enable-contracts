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
        address repaymentManager,
        address contractAdmin
    );

    function initialize(address _appContractAddress) public initializer {
        app = App(_appContractAddress);
    }

    function _createTermsContract(bytes memory _data, address admin)
        internal
        returns (address proxy)
    {
        return address(app.create(ENABLE_CREDIT_PACKAGE, TERMS_CONTRACT, admin, _data));
    }

    function _createCrowdloan(bytes memory _data, address admin) internal returns (address proxy) {
        return address(app.create(ENABLE_CREDIT_PACKAGE, CROWDLOAN, admin, _data));
    }

    function _createRepaymentManager(bytes memory _data, address admin)
        internal
        returns (address proxy)
    {
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
        uint256 crowdfundStart,
        address contractAdmin
    ) public {
        address[] memory proxies = new address[](5);

        proxies[0] = _createTermsContract("", contractAdmin);
        proxies[1] = _createCrowdloan("", contractAdmin);
        proxies[2] = _createRepaymentManager("", contractAdmin);

        address[] memory controllers = new address[](2);
        controllers[0] = proxies[1];
        controllers[1] = proxies[2];

        address[] memory loanInstanceAsController = new address[](1);
        loanInstanceAsController[0] = proxies[1];

        TermsContract(proxies[0]).initialize(
            msg.sender,
            principalToken,
            principalRequested,
            loanPeriod,
            interestRate,
            minimumRepayment,
            maximumRepayment,
            controllers
        );

        Crowdloan(address(uint160(proxies[1]))).initialize(
            proxies[0],
            proxies[2],
            crowdfundLength,
            crowdfundStart
        );

        RepaymentManager(address(uint160(proxies[2]))).initialize(
            proxies[0],
            loanInstanceAsController
        );

        emit LoanCreated(
            msg.sender,
            principalRequested,
            proxies[0],
            proxies[1],
            proxies[2],
            contractAdmin
        );
    }
}
