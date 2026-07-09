import { PeerRecord } from "@mesher/domain";

export interface ContactsProps {
  isPeerConnected?: (peer: PeerRecord) => boolean;
}

export interface ContactRowProps {
  peer: PeerRecord;
  showConnectedBadge: boolean;
  onChevronPress?: () => void;
  chevronColor: string;
  unknownLabel: string;
  connectedBadgeA11y: string;
}
