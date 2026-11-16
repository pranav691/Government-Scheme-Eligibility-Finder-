BEGIN;

UPDATE schemes
SET source_url = CASE scheme_code
    WHEN 'N01' THEN 'https://www.myscheme.gov.in/schemes/pmsswsutpp'
    WHEN 'N02' THEN 'https://www.myscheme.gov.in/schemes/pmsswcapfar'
    WHEN 'N03' THEN 'https://www.myscheme.gov.in/schemes/aicte-ssss'
    WHEN 'N04' THEN 'https://www.myscheme.gov.in/schemes/psgs-deg'
    WHEN 'N05' THEN 'https://www.myscheme.gov.in/schemes/sak-deg'
    WHEN 'N06' THEN 'https://www.myscheme.gov.in/schemes/faewbcilw-ppm'
    WHEN 'N07' THEN 'https://www.myscheme.gov.in/schemes/pm-yasasvitcceobcebcdnts'
    WHEN 'N08' THEN 'https://www.myscheme.gov.in/schemes/nrefhrdnre'
    WHEN 'N09' THEN 'https://scholarships.gov.in/public/schemeGuidelines/STIPEND_STATICAL_GUIDLLINES.pdf'
    WHEN 'N10' THEN 'https://www.myscheme.gov.in/schemes/nts-ug'
    WHEN 'N11' THEN 'https://scholarships.gov.in/public/FAQ/FAQsforICAR%20_PGS_Scholarship_3105.pdf'
    WHEN 'N12' THEN 'https://socialjustice.gov.in/schemes/27'
    WHEN 'N13' THEN 'https://www.myscheme.gov.in/schemes/post-dis'
    WHEN 'N14' THEN 'https://www.myscheme.gov.in/schemes/csss-cus'
    WHEN 'N15' THEN 'https://scholarships.gov.in/public/schemeGuidelines/tribalfellowshipguideline.pdf'
    WHEN 'K01' THEN 'https://kodagu.nic.in/en/minority-welfare-department/'
    WHEN 'K02' THEN 'https://kmdc.karnataka.gov.in/36/overseas-educational-loan/en'
    WHEN 'K03' THEN 'https://www.myscheme.gov.in/schemes/slg'
    WHEN 'K04' THEN 'https://mandya.nic.in/en/chief-ministers-kaushalya-karnataka-yojane-cmkky/'
    WHEN 'K05' THEN 'https://kaushalya.karnataka.gov.in/21/yuvanidhi-scheme/en'
    WHEN 'K06' THEN 'https://www.myscheme.gov.in/schemes/sdtk'
    WHEN 'K07' THEN 'https://www.myscheme.gov.in/schemes/supk'
    WHEN 'K08' THEN 'https://www.myscheme.gov.in/schemes/kvy-k'
    WHEN 'K09' THEN 'https://kmdc.karnataka.gov.in/22/shrama-shakthi/en'
    WHEN 'K10' THEN 'https://kswdc.karnataka.gov.in/21/udyogini/en'
    ELSE source_url
END
WHERE scheme_code IN (
    'N01','N02','N03','N04','N05',
    'N06','N07','N08','N09','N10',
    'N11','N12','N13','N14','N15',
    'K01','K02','K03','K04','K05',
    'K06','K07','K08','K09','K10'
);

COMMIT;
