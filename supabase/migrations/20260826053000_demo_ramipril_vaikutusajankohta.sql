-- Demo-Ramipril aiemmaksi, jotta SmartGraph nayttaa ennen/jalkeen-vaikutuksen.
update public.patient_medications
set started_on = (current_date - 42),
    note = 'Aloitus verenpaineen hoitoon'
where id = 'med_demo_ramipril';
