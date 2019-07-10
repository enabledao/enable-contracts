import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract DaiToken is ERC20Detailed, ERC20Mintable, Ownable {
    constructor() public ERC20Detailed("DaiToken", "DAI", 18) {}
}
