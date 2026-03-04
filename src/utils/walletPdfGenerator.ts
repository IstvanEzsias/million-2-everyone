import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { WalletData } from './walletGenerator';

export async function generateAndDownloadWalletPdf(wallet: WalletData): Promise<void> {
  try {
    // Generate QR codes as data URLs
    const [lanaQr, wifQr] = await Promise.all([
      QRCode.toDataURL(wallet.lanaAddress, { width: 200, margin: 1 }),
      QRCode.toDataURL(wallet.privateKeyWIF, { width: 200, margin: 1 }),
    ]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('LanaCoin Wallet Backup', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, pageWidth / 2, 33, { align: 'center' });

    // --- Section 1: LanaCoin Address ---
    let y = 48;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LanaCoin Address (Public)', 20, y);

    y += 4;
    doc.addImage(lanaQr, 'PNG', 20, y, 45, 45);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(wallet.lanaAddress, 72, y + 20, { maxWidth: pageWidth - 92 });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Share this address to receive LanaCoin.', 72, y + 30);
    doc.setTextColor(0);

    // --- Section 2: Private Key WIF ---
    y += 55;
    const boxLeft = 15;
    const boxRight = pageWidth - 15;
    const boxInnerLeft = boxLeft + 5;
    const boxInnerRight = boxRight - 5;
    const textMaxWidth = boxInnerRight - 72;

    doc.setDrawColor(220, 50, 50);
    doc.setLineWidth(0.5);
    doc.rect(boxLeft, y - 5, boxRight - boxLeft, 70);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text('Private Key (WIF) — KEEP THIS SAFE!', boxInnerLeft, y + 2);
    doc.setTextColor(0);

    y += 8;
    doc.addImage(wifQr, 'PNG', boxInnerLeft, y, 45, 45);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(wallet.privateKeyWIF, 72, y + 20, { maxWidth: textMaxWidth });

    doc.setFontSize(8);
    doc.setTextColor(200, 0, 0);
    doc.text('NEVER share this key. Anyone with this key controls your wallet.', 72, y + 32, { maxWidth: textMaxWidth });
    doc.text('Store this document in a safe place and delete digital copies.', 72, y + 40, { maxWidth: textMaxWidth });
    doc.setTextColor(0);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text('100 Million to Everyone — lanacoin.org', pageWidth / 2, 280, { align: 'center' });

    doc.save('lanacoin-wallet-backup.pdf');
  } catch (error) {
    console.error('Failed to generate wallet PDF:', error);
  }
}
