import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark } from '../../types';
import logo from '../../assets/images/logopta.png';

type PrintRemark = (ComplaintRemark | TechnicianRemark) & {
    source: 'Admin' | 'Juruteknik';
};

export default function PrintReceipt() {
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadComplaint();
    }, [id]);

    const loadComplaint = async () => {
        try {
            const response = await api.get(`/complaints/${id}`);
            setComplaint(response.data.complaint);
            setAdminRemarks(response.data.adminRemarks || []);
            setTechRemarks(response.data.techRemarks || []);
        } catch (error) {
            console.error('Failed to load complaint');
        } finally {
            setIsLoading(false);
        }
    };

    const remarks = useMemo<PrintRemark[]>(() => {
        return [
            ...adminRemarks.map((remark) => ({ ...remark, source: 'Admin' as const })),
            ...techRemarks.map((remark) => ({ ...remark, source: 'Juruteknik' as const })),
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }, [adminRemarks, techRemarks]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!complaint) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">Aduan tidak dijumpai</p>
            </div>
        );
    }

    return (
        <div>
            <style>{`
                /* ===== SCREEN STYLES ===== */
                .print-toolbar {
                    background: #fff;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .print-root {
                    max-width: 1120px;
                    margin: 24px auto;
                    padding: 20px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }

                .print-flex {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                @media (min-width: 1024px) {
                    .print-flex {
                        flex-direction: row;
                    }
                }

                /* ===== PRINT STYLES ===== */
                @page {
                    size: A4 landscape;
                    margin: 5mm;
                }

                @media print {
                    * {
                        box-shadow: none !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .print-toolbar {
                        display: none !important;
                    }

                    .print-root {
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        max-width: none !important;
                        width: auto !important;
                    }

                    .print-flex {
                        display: flex !important;
                        flex-direction: row !important;
                        flex-wrap: nowrap !important;
                        gap: 5mm !important;
                    }

                    .receipt-copy {
                        width: 140mm !important;
                        height: 190mm !important;
                        display: flex !important;
                        flex-direction: column !important;
                        flex-shrink: 0 !important;
                        overflow: hidden !important;
                    }
                }
            `}</style>

            <div className="print-toolbar">
                <Link to={`/admin/complaint/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </Link>
                <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Cetak
                </button>
            </div>

            <div className="print-root">
                <div className="print-flex">
                    <ReceiptCopy complaint={complaint} remarks={remarks} copyLabel="Salinan Pelanggan" />
                    <ReceiptCopy complaint={complaint} remarks={remarks} copyLabel="Salinan Pejabat" />
                </div>
            </div>
        </div>
    );
}

function ReceiptCopy({ complaint, remarks, copyLabel }: { complaint: Complaint; remarks: PrintRemark[]; copyLabel: string }) {
    const customer = complaint.users;
    const technician = complaint.technicians;

    return (
        <section className="receipt-copy flex flex-col h-[190mm] border-2 border-black bg-white text-[7.4px] leading-[1.08]">
            <header className="shrink-0 grid h-[19mm] grid-cols-[24mm_1fr_32mm] border-b-2 border-black">
                <div className="flex items-center justify-center p-1">
                    <img src={logo} alt="PTA Services" className="max-h-[14mm] max-w-[20mm] object-contain" />
                </div>
                <div className="flex flex-col items-center justify-center px-1 text-center">
                    <h1 className="text-[12px] font-black uppercase tracking-normal">PTA SERVICES - E-CARE</h1>
                    <p className="text-[7.5px] font-bold">BORANG KERJA ADUAN KEROSAKAN</p>
                    <p className="text-[6.8px]">Pusat Servis Barangan Elektrik</p>
                    <p className="text-[5.5px] font-bold leading-[1.2] mt-0.5">
                        Lot 709 Kompleks Permint, 22200 Kg. Raja, Besut, Terengganu.<br />
                        Tel : 09-6958843
                    </p>
                </div>
                <div className="flex flex-col justify-center items-end px-2 text-[6.8px]">
                    <div className="grid grid-cols-[auto_auto_auto] gap-x-1 gap-y-1.5 text-right whitespace-nowrap">
                        <span className="font-bold">No Report</span><span>:</span><span className="font-black text-[7.2px] text-left">{complaint.report_number}</span>
                        <span className="font-bold">Tarikh</span><span>:</span><span className="font-semibold text-left">{formatDate(complaint.created_at)}</span>
                        <span className="font-bold">Status</span><span>:</span><span className="font-semibold text-left">{getStatusLabel(complaint.status)}</span>
                    </div>
                </div>
            </header>

            <div className="shrink-0 h-[4mm] border-b-2 border-black px-2 py-0.5 text-center text-[6.8px] font-bold uppercase">{copyLabel}</div>

            <Section title="Maklumat Pelanggan" className="shrink-0">
                <InfoGrid>
                    <Info label="Nama" value={customer?.full_name} wide lastInRow />
                    <Info label="No. IC" value={customer?.ic_number} />
                    <Info label="Telefon" value={customer?.contact_no} lastInRow />
                    <Info label="Telefon 2" value={customer?.contact_no_2} />
                    <Info label="Negeri" value={customer?.state} lastInRow />
                    <Info label="Alamat" value={customer?.address} wide tall lastInRow />
                </InfoGrid>
            </Section>

            <Section title="Maklumat Barangan" className="shrink-0">
                <InfoGrid>
                    <Info label="Kategori" value={complaint.categories?.name} />
                    <Info label="Jenis" value={complaint.subcategory} lastInRow />
                    <Info label="Jenama" value={complaint.brand_name} />
                    <Info label="Model" value={complaint.model_no} lastInRow />
                    <Info label="Waranti" value={complaint.complaint_type} />
                    <Info label="Lokasi Beli" value={complaint.state} lastInRow />
                </InfoGrid>
            </Section>

            <div className="shrink-0 grid grid-cols-[1fr_33mm] border-b-2 border-black">
                <Section title="Aduan / Kerosakan" flush className="h-full border-r-2 border-black">
                    <div className="flex-1 overflow-hidden whitespace-pre-wrap px-1 py-0.5 font-semibold">{complaint.details || '-'}</div>
                </Section>
                <div className="bg-white flex flex-col">
                    <div className="shrink-0 h-[4mm] border-b border-black bg-slate-200 px-1 py-0.5 text-[6.4px] font-black uppercase">Dokumen</div>
                    <CheckRow label="Waranti" checked={Boolean(complaint.warranty_file)} />
                    <CheckRow label="Resit" checked={Boolean(complaint.receipt_file)} />
                    <CheckRow label="Barang" />
                    <CheckRow label="Lengkap" checked={Boolean(customer?.full_name && customer?.contact_no && customer?.address)} />
                </div>
            </div>

            <Section title="Semakan / Catatan Terkini" className="flex-1">
                <div className="flex-1 flex flex-col">
                    {Array.from({ length: 3 }).map((_, index) => {
                        const remark = remarks[index];
                        return (
                            <div key={index} className="flex-1 border-b border-black last:border-b-0 px-1 py-0.5 flex flex-col justify-start">
                                <Line label="Pemeriksaan" value={remark ? (remark.checking || '-') : ''} />
                                <Line label="Transport" value={remark ? (remark.note_transport || '-') : ''} />
                                <Line label="Catatan" value={remark ? (remark.remark || '-') : ''} />
                                <Line label="Remark by" value={remark ? (remark.source === 'Admin' ? 'Admin' : (technician ? `${technician.name} (${technician.department})` : '-')) : ''} />
                            </div>
                        );
                    })}
                </div>
            </Section>

            <Section title="Rekod Tindakan" className="shrink-0">
                <table className="w-full border-collapse text-[6.6px]">
                    <thead>
                        <tr>
                            <Th className="w-[7mm] text-center">Bil</Th>
                            <Th className="w-[18mm]">Tarikh</Th>
                            <Th className="w-[24mm]">Di catat oleh</Th>
                            <Th>Catatan</Th>
                            <Th className="w-[20mm]">Status</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 3 }).map((_, index) => {
                            const remark = remarks[index];
                            return (
                                <tr key={index} className="h-[5mm] align-top">
                                    <Td className="text-center">{index + 1}</Td>
                                    <Td>{remark ? formatDate(remark.created_at) : ''}</Td>
                                    <Td>{remark?.source || ''}</Td>
                                    <Td>{remark?.remark || remark?.checking || remark?.note_transport || ''}</Td>
                                    <Td>{remark ? getStatusLabel(remark.status) : ''}</Td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Section>

            <div className="shrink-0 grid h-[15mm] grid-cols-3 overflow-hidden text-[6.3px]">
                <SignBox title="Diterima Oleh" />
                <SignBox title="Pelanggan" name={customer?.full_name} />
                <SignBox title="Juruteknik" name={technician?.name} last />
            </div>

            <footer className="shrink-0 h-[3mm] border-t border-black px-1 py-0.5 text-[5.8px]">
                Dicetak: {formatDateTime(new Date().toISOString())}
            </footer>
        </section>
    );
}

function Section({ title, children, flush = false, className = '' }: { title: string; children: React.ReactNode; flush?: boolean; className?: string }) {
    return (
        <section className={`flex flex-col ${flush ? '' : 'border-b-2 border-black'} ${className}`}>
            <h2 className="shrink-0 h-[4mm] border-b border-black bg-slate-200 px-1 py-0.5 text-[6.4px] font-black uppercase">{title}</h2>
            {children}
        </section>
    );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-[18mm_1fr_17mm_1fr]">{children}</div>;
}

function Info({ label, value, wide = false, tall = false, lastInRow = false }: { label: string; value?: string | number | null; wide?: boolean; tall?: boolean; lastInRow?: boolean }) {
    const heightClass = tall ? 'h-[9.6mm]' : 'h-[4.8mm]';
    return (
        <>
            <div className={`${heightClass} border-r border-b border-black bg-slate-50 px-1 py-0.5 font-bold`}>{label}</div>
            <div className={`${heightClass} overflow-hidden border-b border-black px-1 py-0.5 font-semibold ${lastInRow ? '' : 'border-r'} ${wide ? 'col-span-3' : ''} ${tall ? 'whitespace-pre-wrap' : ''}`}>
                {value || '-'}
            </div>
        </>
    );
}

function Line({ label, value }: { label: string; value?: string | null }) {
    return (
        <p className="mb-0.5 text-[6.6px] leading-[1.1]">
            <span className="font-bold">{label}:</span> <span className="font-semibold">{value ?? '-'}</span>
        </p>
    );
}

function CheckRow({ label, checked = false }: { label: string; checked?: boolean }) {
    return (
        <div className="shrink-0 grid grid-cols-[1fr_10mm] border-b border-black last:border-b-0">
            <span className="h-[4.25mm] px-1 py-0.5 font-semibold">{label}</span>
            <span className="h-[4.25mm] border-l border-black px-1 py-0.5 text-center font-black">{checked ? '/' : ''}</span>
        </div>
    );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <th className={`border-r border-b border-black px-1 py-0.5 text-left font-black last:border-r-0 ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <td className={`border-r border-b border-black px-1 py-0.5 last:border-r-0 ${className}`}>{children}</td>;
}

function SignBox({ title, name, last = false }: { title: string; name?: string | null; last?: boolean }) {
    return (
        <div className={`h-[15mm] px-1 py-0.5 ${last ? '' : 'border-r-2 border-black'}`}>
            <p className="font-black uppercase">{title}</p>
            <div className="h-[4mm]"></div>
            <div className="border-t border-black pt-0.5">
                <p className="h-[6px] truncate font-semibold uppercase">{name || ' '}</p>
                <p>Tarikh:</p>
            </div>
        </div>
    );
}

function formatDate(dateString?: string | null) {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleDateString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatDateTime(dateString?: string | null) {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStatusLabel(status?: Complaint['status'] | null) {
    switch (status) {
        case 'pending':
            return 'Menunggu';
        case 'in_process':
            return 'Dalam Proses';
        case 'closed':
            return 'Selesai';
        case 'cancelled':
            return 'Dibatalkan';
        default:
            return '-';
    }
}
