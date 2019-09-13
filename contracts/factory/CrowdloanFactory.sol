pragma solidity 0.5.11;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";
import "../crowdloan/Crowdloan.sol";

contract CrowdloanFactory is Initializable {
    string constant ENABLE_CREDIT_PACKAGE = "enable-credit";
    string constant TERMS_CONTRACT = "TermsContract";
    string constant CROWDLOAN = "Crowdloan";
    string constant REPAYMENT_ROUTER = "RepaymentManager";

    App public app;

    event LoanCreated(
        address indexed borrower,
        uint256 indexed principalRequested,
        address crowdloan,
        string loanMetadataUrl,
        address contractAdmin
    );

    function initialize(address _appContractAddress) public initializer {
        app = App(_appContractAddress);
    }

    function _createCrowdloan(bytes memory _data, address admin) internal returns (address proxy) {
        return address(app.create(ENABLE_CREDIT_PACKAGE, CROWDLOAN, admin, _data));
    }

    function deploy(
        IERC20 principalToken,
        uint256 principalRequested,
        uint256 crowdfundLength,
        string calldata loanMetadataUrl,
        address contractAdmin
    ) external {
        address crowdloan = _createCrowdloan("", contractAdmin);

        Crowdloan(crowdloan).initialize(
            msg.sender,
            principalToken,
            principalRequested,
            crowdfundLength,
            loanMetadataUrl
        );

        emit LoanCreated(msg.sender, principalRequested, crowdloan, loanMetadataUrl, contractAdmin);
    }
}
