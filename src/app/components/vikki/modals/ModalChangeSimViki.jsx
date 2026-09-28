import { Button } from '@/app/components/ui/Button';
import HotDealTag from '@/app/components/vikki/HotDealTag';
import SimDataService from '@/app/services/simDataService';
import { basePriceSim, priceSim } from '@/app/utils/calculate';
import { formatPhoneNumber, toCurrency } from '@/app/utils/format';
import { useLoad } from '@/app/utils/load';
import { useModal } from '@/app/utils/modal';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InputSearchNumberVikki } from '../../form/inputSreachNumber';

const PAGE_SIZE = 20;

const ModalChangeSimViki = ({ onChange }) => {
    const t = useTranslations('vikki.modalChangeSim');
    const { close, done } = useModal();
    const [sims, setSims] = useState([]);

    const [selectedSim, setSelectedSim] = useState(null);
    const [isListSim, setIsListSim] = useState(false);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const { open, close: closeLoad } = useLoad();

    const listRef = useRef(null);
    const sentinelRef = useRef(null);

    // Sắp xếp cố định theo số. BE mặc định xáo random() mỗi lần gọi, cuộn sang trang sau
    // sẽ nhận một lượt xáo mới nên vừa lặp số vừa sót số. sort_group vẫn đứng trước
    // nên khối số đẹp khuyến mại luôn nằm trên đầu.
    const fetchPage = useCallback(async (searchQuery, pageNumber) => {
        const res = await SimDataService.searchSim({
            filters: {
                search: searchQuery ? '070' + searchQuery : '',
            },
            sort: [{ field: 'msisdn', type: 'ASC' }],
            page: pageNumber,
            pageSize: PAGE_SIZE,
        });
        return Array.isArray(res) ? res : [];
    }, []);

    const loadFirstPage = useCallback(async (searchQuery = '') => {
        try {
            open();
            const res = await fetchPage(searchQuery, 1);
            // Giữ nguyên danh sách cũ khi tìm không ra, như hành vi trước đây.
            if (res.length > 0) {
                setSims(res);
            }
            setIsListSim(res.length > 0);
            setPage(1);
            setHasMore(res.length === PAGE_SIZE);
            if (listRef.current) {
                listRef.current.scrollTop = 0;
            }
        } catch (error) {
            console.error('Error fetching sim data:', error);
        } finally {
            closeLoad();
        }
    }, [fetchPage, open, closeLoad]);

    const loadNextPage = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        const nextPage = page + 1;
        try {
            setLoadingMore(true);
            const res = await fetchPage(query, nextPage);
            if (res.length > 0) {
                setSims((prev) => {
                    const seen = new Set(prev.map((item) => item.msisdn));
                    return [...prev, ...res.filter((item) => !seen.has(item.msisdn))];
                });
            }
            setPage(nextPage);
            setHasMore(res.length === PAGE_SIZE);
        } catch (error) {
            console.error('Error fetching more sim data:', error);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    }, [fetchPage, hasMore, loadingMore, page, query]);

    useEffect(() => {
        loadFirstPage('');
    }, []);

    // Chạm đáy danh sách thì tự kéo trang kế tiếp.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadNextPage();
                }
            },
            { root: listRef.current, rootMargin: '120px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadNextPage]);

    const handleSearch = (searchQuery) => {
        const next = searchQuery || '';
        setQuery(next);
        loadFirstPage(next);
    };

    const handleConfirm = () => {
        if (selectedSim) {
            onChange(selectedSim);
            close();
        }
    };

    // Backend đã xếp số đẹp khuyến mại lên đầu; tách ra thành khối riêng để gắn tiêu đề nhóm.
    const promoSims = useMemo(() => sims.filter((sim) => sim.is_promo), [sims]);
    const normalSims = useMemo(() => sims.filter((sim) => !sim.is_promo), [sims]);

    const renderSim = (sim) => {
        const isSelected = selectedSim?.msisdn === sim.msisdn;
        // Số khuyến mại chưa chọn được nền hồng rất nhạt để nhận ra cả khối mà không lấn màu chọn.
        const surface = isSelected
            ? 'border-[#0000EA] bg-white shadow-sm'
            : sim.is_promo
                ? 'border-[#F3D9E9] bg-[#FFFAFD]'
                : 'border-[#F1F1F1] bg-white';

        return (
            <div
                key={sim.msisdn}
                onClick={() => setSelectedSim(sim)}
                className={`p-4 rounded-[12px] border flex items-center justify-between cursor-pointer transition-all ${surface}`}
            >
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[20px] font-semibold text-[#333] leading-none">{formatPhoneNumber(sim.msisdn)}</span>
                        {sim.is_promo && <HotDealTag />}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[16px] font-medium text-[#333]">{toCurrency(priceSim(sim))}</span>
                        {basePriceSim(sim) > priceSim(sim) && (
                            <span className="text-[14px] text-[#8A8A8A] line-through">{toCurrency(basePriceSim(sim))}</span>
                        )}
                    </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#0000EA] bg-[#0000EA]' : 'border-[#A1A1A1] bg-white'}`}>
                    {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </div>
        );
    };

    const groupTitle = (label, accent = false) => (
        <div className="flex items-center gap-2 pt-1">
            <span className={`text-[12px] font-semibold uppercase tracking-[0.04em] ${accent ? 'text-[#D2008C]' : 'text-[#A1A1A1]'}`}>
                {label}
            </span>
            <span className={`h-[1px] flex-1 ${accent ? 'bg-[#F3D9E9]' : 'bg-[#F1F1F1]'}`} />
        </div>
    );

    return (
        <div className="relative bg-white rounded-t-[24px] w-full h-[90vh] flex flex-col">


            {/* Header */}
            <div className="px-4 py-2 flex items-center justify-between shrink-0 relative">
                <button onClick={close} className="p-2 -ml-2 relative z-10">
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] absolute left-1/2 -translate-x-1/2 w-full text-center">{t('title')}</h3>
            </div>

            {/* Search Input */}
            <InputSearchNumberVikki onSearch={handleSearch} prefix={t('searchPrefix')} number={7} searchHint={t('searchHint')} />

            {!isListSim && (
                <div className="w-full text-center text-neutral-500 flex flex-col items-center mb-6">
                    <Image src="/images/simdata/no_search.svg" alt="No data" width={50} height={50} className="w-20 h-20 mb-2" />
                    <p className="text-sm">{t('noResultsMessage')}</p>
                </div>
            )}

            {/* Sim List */}
            <div ref={listRef} className="flex-1 overflow-y-auto  py-2 space-y-3">

                {promoSims.length > 0 && (
                    <>
                        {groupTitle(t('promoGroupTitle'), true)}
                        {promoSims.map(renderSim)}
                        {normalSims.length > 0 && groupTitle(t('normalGroupTitle'))}
                    </>
                )}
                {normalSims.map(renderSim)}

                {/* Điểm chạm để tự tải trang kế tiếp */}
                <div ref={sentinelRef} className="h-px" />
                {loadingMore && (
                    <p className="py-2 text-center text-[13px] text-[#A1A1A1]">{t('loadingMore')}</p>
                )}
            </div>

            {/* Bottom Action */}
            <div className="border-t border-[#F1F1F1] shrink-0 bg-white pb-12">
                <Button
                    onClick={handleConfirm}
                    disabled={!selectedSim}
                    className='w-full '
                >
                    {t('confirmButton')}
                </Button>
            </div>
        </div>
    );
};

export default ModalChangeSimViki;
