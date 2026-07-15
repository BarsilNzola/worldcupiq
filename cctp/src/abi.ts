export const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)',
  'function replaceDepositForBurn(uint64 originalNonce, address originalBurnToken, uint256 originalAmount, bytes32 originalMintRecipient, uint32 originalDestinationDomain) external',
  'function burnToken(address token, uint256 amount, bytes32 message) external',
  'function receiveMessage(bytes calldata message, bytes calldata attestation) external',
  'event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address indexed burnTokenSender)'
]

export const CCTP_MESSENGER_ABI = [
  'function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool success)',
  'function getMessageStatus(bytes32 messageHash) external view returns (uint8 status, uint64 timestamp)',
  'function nextAvailableNonce() external view returns (uint64)',
  'event MessageSent(bytes32 indexed messageHash, uint64 nonce, uint32 sourceDomain, uint32 destinationDomain, bytes sender, bytes recipient, bytes messageBody)',
  'event MessageReceived(bytes32 indexed messageHash, uint64 nonce, uint32 sourceDomain, uint32 destinationDomain, bytes sender, bytes recipient, bytes messageBody)'
]