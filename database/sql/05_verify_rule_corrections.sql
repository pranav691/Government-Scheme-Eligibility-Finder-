SELECT s.scheme_code,g.group_order,g.group_name,r.attribute_name,r.operator,
       r.numeric_value,r.text_value,r.boolean_value
FROM eligibility_rules r JOIN eligibility_rule_groups g USING(group_id)
JOIN schemes s USING(scheme_id)
WHERE s.scheme_code IN ('N01','N04','N05','N14','K05','K09','K10')
ORDER BY s.scheme_code,g.group_order,r.attribute_name,r.operator;

SELECT s.scheme_code,c.category_name FROM scheme_categories sc
JOIN schemes s USING(scheme_id) JOIN categories c USING(category_id)
WHERE s.scheme_code='K07' ORDER BY c.category_name;

SELECT scheme_code,eligibility_rules_complete FROM schemes ORDER BY scheme_code;

SELECT a.application_id,s.scheme_code,a.current_status,a.eligibility_result
FROM applications a JOIN schemes s USING(scheme_id) ORDER BY a.application_id;

-- Must return zero rows.
SELECT group_id,attribute_name,operator,count(*) FROM eligibility_rules
GROUP BY group_id,attribute_name,operator HAVING count(*)>1;
