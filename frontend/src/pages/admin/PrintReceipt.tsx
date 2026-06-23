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
        <div className="min-h-screen bg-slate-100 text-black">
            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 4mm;
                }

                @media print {
                    html,
                    body,
                    #root {
                        width: 297mm;
                        min-height: 210mm;
                        margin: 0 !important;
                        background: #fff !important;
                        overflow: hidden !important;
                    }

                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .print-stage {
                        width: 289mm !important;
                        height: 202mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        box-shadow: none !important;
                        overflow: hidden !important;
                    }

                    .print-grid {
                        width: 289mm !important;
                        height: 202mm !important;
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 3mm !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    .receipt-copy {
                        width: 143mm !important;
                        height: 202mm !important;
                        overflow: hidden !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="no-print bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                <Link to={`/admin/complaint/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </Link>
                <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Cetak
                </button>
            </div>

            <main className="print-stage mx-auto my-6 w-[1120px] max-w-[calc(100vw-32px)] bg-white p-5 shadow-xl border border-slate-200">
                <div className="print-grid grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <ReceiptCopy complaint={complaint} remarks={remarks} copyLabel="Salinan Pelanggan" />
                    <ReceiptCopy complaint={complaint} remarks={remarks} copyLabel="Salinan Pejabat" />
                </div>
            </main>
        </div>
    );
}

function ReceiptCopy({ complaint, remarks, copyLabel }: { complaint: Complaint; remarks: PrintRemark[]; copyLabel: string }) {
    const customer = complaint.users;
    const technician = complaint.technicians;
    const latestRemark = remarks[remarks.length - 1];

    return (
        <section className="receipt-copy border-2 border-black bg-white text-[8px] leading-[1.12]">
            <header className="grid h-[21mm] grid-cols-[25mm_1fr_34mm] border-b-2 border-black">
                <div className="flex items-center justify-center border-r-2 border-black p-1">
                    <img src={logo} alt="PTA Services" className="max-h-[16mm] max-w-[22mm] object-contain" />
                </div>
                <div className="text-center px-1 py-1.5">
                    <h1 className="text-[13px] font-black uppercase tracking-normal">PTA SERVICES - E-CARE</h1>
                    <p className="text-[8.5px] font-bold">BORANG KERJA ADUAN KEROSAKAN</p>
                    <p className="text-[7.5px]">Pusat Servis Barangan Elektrik</p>
                </div>
                <div className="text-[7.5px]">
                    <TopBox label="No." value={complaint.report_number} strong />
                    <TopBox label="Tarikh" value={formatDate(complaint.created_at)} />
                    <TopBox label="Status" value={getStatusLabel(complaint.status)} last />
                </div>
            </header>

            <div className="h-[5mm] border-b-2 border-black px-2 py-0.5 text-center text-[7.5px] font-bold uppercase">{copyLabel}</div>

            <Section title="Maklumat Pelanggan">
                <InfoGrid>
                    <Info label="Nama" value={customer?.full_name} wide />
                    <Info label="No. IC" value={customer?.ic_number} />
                    <Info label="Telefon" value={customer?.contact_no} />
                    <Info label="Telefon 2" value={customer?.contact_no_2} />
                    <Info label="Negeri" value={customer?.state} />
                    <Info label="Alamat" value={customer?.address} wide tall />
                </InfoGrid>
            </Section>

            <Section title="Maklumat Barangan">
                <InfoGrid>
                    <Info label="Kategori" value={complaint.categories?.name} />
                    <Info label="Jenis" value={complaint.subcategory} />
                    <Info label="Jenama" value={complaint.brand_name} />
                    <Info label="Model" value={complaint.model_no} />
                    <Info label="Waranti" value={complaint.complaint_type} />
                    <Info label="Lokasi Beli" value={complaint.state} />
                </InfoGrid>
            </Section>

            <Section title="Aduan / Kerosakan">
                <div className="h-[16mm] overflow-hidden whitespace-pre-wrap px-1 py-0.5 font-semibold">{complaint.details || '-'}</div>
            </Section>

            <div className="grid h-[24mm] grid-cols-[1fr_34mm] border-b-2 border-black overflow-hidden">
                <Section title="Semakan / Catatan Terkini" flush>
                    <div className="h-[19mm] overflow-hidden px-1 py-0.5">
                        <Line label="Pemeriksaan" value={latestRemark?.checking} />
                        <Line label="Transport" value={latestRemark?.note_transport} />
                        <Line label="Catatan" value={latestRemark?.remark} />
                        <Line label="Juruteknik" value={technician ? `${technician.name} (${technician.department})` : '-'} />
                    </div>
                </Section>
                <div className="border-l-2 border-black">
                    <div className="h-[5mm] border-b border-black bg-slate-200 px-1 py-0.5 text-[7px] font-black uppercase">Dokumen</div>
                    <CheckRow label="Waranti" checked={Boolean(complaint.warranty_file)} />
                    <CheckRow label="Resit" checked={Boolean(complaint.receipt_file)} />
                    <CheckRow label="Barang" />
                    <CheckRow label="Lengkap" checked={Boolean(customer?.full_name && customer?.contact_no && customer?.address)} />
                </div>
            </div>

            <Section title="Rekod Tindakan">
                <table className="w-full border-collapse text-[7.2px]">
                    <thead>
                        <tr>
                            <Th className="w-[7mm] text-center">Bil</Th>
                            <Th className="w-[18mm]">Tarikh</Th>
                            <Th className="w-[19mm]">Oleh</Th>
                            <Th>Catatan</Th>
                            <Th className="w-[20mm]">Status</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 3 }).map((_, index) => {
                            const remark = remarks[index];
                            return (
                                <tr key={index} className="h-[5.8mm] align-top">
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

            <div className="grid h-[18mm] grid-cols-3 overflow-hidden text-[7px]">
                <SignBox title="Diterima Oleh" />
                <SignBox title="Pelanggan" name={customer?.full_name} />
                <SignBox title="Juruteknik" name={technician?.name} last />
            </div>

            <footer className="h-[4mm] border-t border-black px-1 py-0.5 text-[6.5px]">
                Dicetak: {formatDateTime(new Date().toISOString())}
            </footer>
        </section>
    );
}

function Section({ title, children, flush = false }: { title: string; children: React.ReactNode; flush?: boolean }) {
    return (
        <section className={flush ? '' : 'border-b-2 border-black'}>
            <h2 className="h-[5mm] border-b border-black bg-slate-200 px-1 py-0.5 text-[7px] font-black uppercase">{title}</h2>
            {children}
        </section>
    );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-[18mm_1fr_17mm_1fr]">{children}</div>;
}

function Info({ label, value, wide = false, tall = false }: { label: string; value?: string | number | null; wide?: boolean; tall?: boolean }) {
    return (
        <>
            <div className="h-[5.5mm] border-r border-b border-black bg-slate-50 px-1 py-0.5 font-bold">{label}</div>
            <div className={`h-[5.5mm] overflow-hidden border-b border-black px-1 py-0.5 font-semibold ${wide ? 'col-span-3' : ''} ${tall ? 'h-[11mm] whitespace-pre-wrap' : ''}`}>
                {value || '-'}
            </div>
        </>
    );
}

function TopBox({ label, value, strong = false, last = false }: { label: string; value: string; strong?: boolean; last?: boolean }) {
    return (
        <div className={`grid grid-cols-[12mm_1fr] ${last ? '' : 'border-b border-black'}`}>
            <span className="h-[7mm] border-r border-black px-1 py-0.5 font-bold">{label}</span>
            <span className={`h-[7mm] overflow-hidden px-1 py-0.5 ${strong ? 'text-[8px] font-black' : 'font-semibold'}`}>{value}</span>
        </div>
    );
}

function Line({ label, value }: { label: string; value?: string | null }) {
    return (
        <p className="mb-0.5">
            <span className="font-bold">{label}:</span> <span className="font-semibold">{value || '-'}</span>
        </p>
    );
}

function CheckRow({ label, checked = false }: { label: string; checked?: boolean }) {
    return (
        <div className="grid grid-cols-[1fr_10mm] border-b border-black last:border-b-0">
            <span className="h-[4.75mm] px-1 py-0.5 font-semibold">{label}</span>
            <span className="h-[4.75mm] border-l border-black px-1 py-0.5 text-center font-black">{checked ? '/' : ''}</span>
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
        <div className={`h-[18mm] px-1 py-0.5 ${last ? '' : 'border-r-2 border-black'}`}>
            <p className="font-black uppercase">{title}</p>
            <div className="h-[6mm]"></div>
            <div className="border-t border-black pt-0.5">
                <p className="h-[7px] truncate font-semibold uppercase">{name || ' '}</p>
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
