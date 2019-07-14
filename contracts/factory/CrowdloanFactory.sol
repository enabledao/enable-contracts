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

    event TestProxy(address proxy);

    function initialize(address _appContractAddress) public initializer {
        app = App(_appContractAddress);
    }

    function _createTermsContract(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, TERMS_CONTRACT, admin, _data));
    }

    function _createCrowdloan(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, CROWDLOAN, admin, _data));
    }

    function _createRepaymentManager(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, REPAYMENT_ROUTER, admin, _data));
    }

    function deploy(
        address _principalTokenAddr,
        uint256 _principal,
        uint256 _timeUnitType,
        uint256 _loanPeriod,
        uint256 _interestRate,
        uint256 _crowdfundLength,
        uint256 _crowdfundStart
    ) public {
        // TODO(Dan): Asserts and require statements

        address termsContractInstance = _createTermsContract("");
        address crowdloanInstance = _createCrowdloan("");
        address repaymentManagerInstance = _createRepaymentManager("");

        // // address(uint160(addr))

        address[] memory _controllers = new address[](2);
        _controllers[0] = crowdloanInstance;
        _controllers[1] = repaymentManagerInstance;

        TermsContract(termsContractInstance).initialize(
            msg.sender,
            _principalTokenAddr,
            _principal,
            _timeUnitType,
            _loanPeriod,
            _interestRate,
            _controllers
        );

        Crowdloan(address(uint160(crowdloanInstance))).initialize(
            termsContractInstance,
            repaymentManagerInstance,
            _crowdfundLength,
            _crowdfundStart
        );

        RepaymentManager(address(uint160(repaymentManagerInstance))).initialize(
            _principalTokenAddr,
            termsContractInstance,
            crowdloanInstance
        );

        emit LoanCreated(
            msg.sender,
            _principal,
            termsContractInstance,
            crowdloanInstance,
            repaymentManagerInstance
        );
    }
}
