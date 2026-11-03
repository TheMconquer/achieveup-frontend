import React, { useRef } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface DialogPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  labelledBy?: string;
}

/** The visible panel of a modal: dialog semantics plus focus handling. */
const DialogPanel: React.FC<DialogPanelProps> = ({ onClose, labelledBy, children, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      {...props}
    >
      {children}
    </div>
  );
};

export default DialogPanel;
