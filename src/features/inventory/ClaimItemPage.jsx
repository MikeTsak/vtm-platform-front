// /item/:code — where a QR lands when scanned with the phone's own camera.
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from '../../styles/Inventory.module.css';
import ReceiveFlow from './ReceiveFlow';

export default function ClaimItemPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const toSheet = () => navigate('/character', { replace: true });

  return (
    <div className={styles.claimPage}>
      <ReceiveFlow code={code} onClose={toSheet} onDone={toSheet} />
    </div>
  );
}
