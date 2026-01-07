// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AbstractVault.sol";

/**
 * @title GroupVault
 * @dev A shared savings vault. Locked until members vote to pay out.
 *      Native C2FLR Only.
 */
contract GroupVault is AbstractVault {

    struct Proposal {
        address recipient;
        uint256 amount;
        string description;
        uint256 approvals;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(address => bool) public isMember;
    address[] public members;
    uint256 public approvalThreshold;
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    event MemberAdded(address indexed member);
    event ProposalCreated(uint256 indexed id, address recipient, uint256 amount, string desc);
    event ProposalVoted(uint256 indexed id, address voter);
    event ProposalExecuted(uint256 indexed id, address recipient, uint256 amount);

    modifier onlyMember() {
        require(isMember[msg.sender], "Not a member");
        _;
    }

    constructor(
        // No _token
        string memory _purpose,
        address[] memory _initialMembers,
        uint256 _approvalThreshold
    ) AbstractVault(_purpose, msg.sender) { 
        require(_approvalThreshold > 0 && _approvalThreshold <= _initialMembers.length, "Invalid threshold");
        
        for(uint256 i = 0; i < _initialMembers.length; i++) {
            isMember[_initialMembers[i]] = true;
            members.push(_initialMembers[i]);
            emit MemberAdded(_initialMembers[i]);
        }
        approvalThreshold = _approvalThreshold;
    }

    function _onDeposit(address, uint256) internal override virtual {
        // Any logic
    }

    function createProposal(address _recipient, uint256 _amount, string calldata _description) external onlyMember {
        require(_amount <= totalAssets(), "Insufficient funds");
        
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.recipient = _recipient;
        p.amount = _amount;
        p.description = _description;
        p.executed = false;
        p.approvals = 0;

        emit ProposalCreated(id, _recipient, _amount, _description);
    }

    function vote(uint256 _proposalId) external onlyMember {
        Proposal storage p = proposals[_proposalId];
        require(!p.executed, "Already executed");
        require(!p.hasVoted[msg.sender], "Already voted");

        p.hasVoted[msg.sender] = true;
        p.approvals++;

        emit ProposalVoted(_proposalId, msg.sender);

        if (p.approvals >= approvalThreshold) {
            _executeProposal(_proposalId);
        }
    }

    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage p = proposals[_proposalId];
        require(p.amount <= totalAssets(), "Insufficient funds");

        p.executed = true;
        
        // Native Transfer
        (bool success, ) = payable(p.recipient).call{value: p.amount}("");
        require(success, "Transfer failed");

        emit ProposalExecuted(_proposalId, p.recipient, p.amount);
        emit Withdrawn(p.recipient, p.amount, block.timestamp, "GROUP_PAYOUT");
    }
    
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }
}
