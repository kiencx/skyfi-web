import faqService from "@/app/services/faqService";
import { useLoad } from "@/app/utils/load";
import { useLocale } from "next-intl";
import { createContext, useContext, useEffect, useState } from "react";
import { FAQ_DATA } from "./faqData";

const SupportContext = createContext();

export const useSupport = () => {
    return useContext(SupportContext);
}

const getStaticFAQDataForLocale = (locale) => FAQ_DATA[locale] || FAQ_DATA.vi;

export const ProvideSupport = ({ children }) => {
    const locale = useLocale();
    const [FAQData, setFAQData] = useState([]);
    const [FQADataDisplay, setFQADataDisplay] = useState([]);
    const [isShowAll, setIsShowAll] = useState(false);
    const { open, close } = useLoad();

    const getFAQData = async () => {
        try {
            open();
            const response = await faqService.getFAQs(locale);
            const apiData = response.data || [];
            const data = [...apiData, ...getStaticFAQDataForLocale(locale)];
            setFAQData(data);
            setFQADataDisplay(data);
        } catch (error) {
            console.error("Failed to fetch FAQ data:", error);
            setFAQData(getStaticFAQDataForLocale(locale));
            setFQADataDisplay(getStaticFAQDataForLocale(locale));
        } finally {
            close();
        }
    }

    useEffect(() => {
        getFAQData();
    }, [locale]);

    useEffect(() => {
        if (!isShowAll) {
            setFQADataDisplay(FAQData.slice(0, 3));
        }
    }, [isShowAll]);

    const searchInFAQ = (keyword) => {
        if (!keyword) {
            setFQADataDisplay(FAQData);
            return;
        }

        const lowerKeyword = keyword.toLowerCase();
        const filteredData = FAQData.filter(category =>
            category.display_title.toLowerCase().includes(lowerKeyword) ||
            category.display_content.toLowerCase().includes(lowerKeyword)
        );

        setFQADataDisplay(filteredData);
    }




    return (
        <SupportContext.Provider value={{ FQADataDisplay, isShowAll, setIsShowAll, searchInFAQ }}>
            {children}
        </SupportContext.Provider>
    );
}