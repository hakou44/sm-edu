# -*- coding: utf-8 -*-
"""Replacement questions for the 20 legacy duplicate records (v1.11.0).

Each key is the id of a redundant record that repeated a question already
present in the same grade/subject pair. The id, grade, subject, term, topic
and lesson are kept (exam papers reference the id); only the question content
is replaced. Values:

    kept_id        record that keeps the original question
    difficulty     مبتدئ / متوسط / متقدم
    cognitive      recall / understand / apply / analyze
    question       new question text
    choices        three distinct choices
    answer_index   index of the correct choice (0-2)
    explanation    short justification
    steps          two solution steps

All items are platform-authored practice material, not official content.
"""

REPLACEMENTS = {
    # --- Informatics: input devices (term 1) ---
    "14-0049": {
        "kept_id": "06-0177", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "أي جهاز يُستخدم لتحريك المؤشر على شاشة الحاسوب؟",
        "choices": ["الطابعة", "الفأرة", "السماعات"], "answer_index": 1,
        "explanation": "الفأرة جهاز إدخال يحرّك المؤشر ويسمح بالنقر على العناصر.",
        "steps": ["نحدد أن المطلوب جهاز إدخال يتحكم في المؤشر.",
                  "الفأرة ترسل حركة اليد إلى الحاسوب، أما الطابعة والسماعات فهما جهازا إخراج."],
    },
    "14-0208": {
        "kept_id": "07-0217", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "ما وظيفة الماسح الضوئي (السكانر)؟",
        "choices": ["تحويل الوثائق الورقية إلى صور رقمية", "طباعة الصور على الورق", "تشغيل الأصوات والموسيقى"],
        "answer_index": 0,
        "explanation": "الماسح الضوئي جهاز إدخال يلتقط صورة الوثيقة الورقية ويحوّلها إلى ملف رقمي.",
        "steps": ["نتذكر أن الماسح الضوئي جهاز إدخال.",
                  "يُدخل صورة الوثيقة إلى الحاسوب في شكل ملف رقمي."],
    },
    "14-0130": {
        "kept_id": "08-0257", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "أي جهاز يُستخدم لإدخال الصوت إلى الحاسوب؟",
        "choices": ["مكبر الصوت", "الشاشة", "الميكروفون"], "answer_index": 2,
        "explanation": "الميكروفون جهاز إدخال يلتقط الصوت ويحوّله إلى إشارة رقمية.",
        "steps": ["نميز بين التقاط الصوت وإخراجه.",
                  "الميكروفون يلتقط الصوت (إدخال)، ومكبر الصوت يُخرجه (إخراج)."],
    },
    "14-0286": {
        "kept_id": "09-0297", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "أي جهاز إدخال يلتقط الصورة المتحركة اللازمة لإجراء مكالمة مرئية؟",
        "choices": ["كاميرا الويب", "الطابعة", "مكبر الصوت"], "answer_index": 0,
        "explanation": "كاميرا الويب جهاز إدخال يلتقط الصورة ويرسلها إلى الحاسوب.",
        "steps": ["نحدد أن المطلوب جهاز يلتقط الصورة.",
                  "كاميرا الويب جهاز إدخال، أما الطابعة ومكبر الصوت فهما جهازا إخراج."],
    },
    "14-0019": {
        "kept_id": "10-0337", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "ما الفرق الصحيح بين جهاز الإدخال وجهاز الإخراج؟",
        "choices": ["جهاز الإدخال يعرض نتائج المعالجة وجهاز الإخراج يرسل البيانات",
                    "جهاز الإدخال يرسل البيانات إلى الحاسوب وجهاز الإخراج يعرض نتائج المعالجة",
                    "الجهازان يؤديان الوظيفة نفسها"],
        "answer_index": 1,
        "explanation": "أجهزة الإدخال تدخل البيانات إلى الحاسوب، وأجهزة الإخراج تعرض نتائج المعالجة للمستخدم.",
        "steps": ["نحدد اتجاه البيانات: نحو الحاسوب أو منه.",
                  "من المستخدم إلى الحاسوب هو إدخال، ومن الحاسوب إلى المستخدم هو إخراج."],
    },
    "14-0178": {
        "kept_id": "11-0377", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "أي جهاز يُعدّ جهاز إدخال وجهاز إخراج في الوقت نفسه؟",
        "choices": ["الفأرة", "الطابعة", "الشاشة اللمسية"], "answer_index": 2,
        "explanation": "الشاشة اللمسية تعرض المعلومات (إخراج) وتستقبل لمسات المستخدم (إدخال).",
        "steps": ["نبحث عن جهاز يؤدي الوظيفتين معًا.",
                  "الفأرة إدخال فقط والطابعة إخراج فقط، أما الشاشة اللمسية فتجمع بينهما."],
    },
    "14-0100": {
        "kept_id": "12-0417", "difficulty": "مبتدئ", "cognitive": "understand",
        "question": "أي جهاز إدخال يُستخدم في المتاجر لقراءة الرمز الشريطي للمنتجات؟",
        "choices": ["قارئ الرمز الشريطي", "الطابعة", "السماعات"], "answer_index": 0,
        "explanation": "قارئ الرمز الشريطي جهاز إدخال يقرأ الرمز ويرسل معلومات المنتج إلى الحاسوب.",
        "steps": ["نحدد أن المطلوب جهاز يقرأ معلومات من الرمز.",
                  "قارئ الرمز الشريطي هو جهاز الإدخال المناسب لهذه المهمة."],
    },
    # --- Informatics: browser (term 1) ---
    "INF169-06-10": {
        "kept_id": "X13-0133", "difficulty": "مبتدئ", "cognitive": "recall",
        "question": "أي برنامج من البرامج التالية هو متصفح ويب؟",
        "choices": ["Microsoft Word", "Mozilla Firefox", "Paint"], "answer_index": 1,
        "explanation": "Mozilla Firefox متصفح ويب، أما Microsoft Word فمعالج نصوص وPaint برنامج رسم.",
        "steps": ["نتذكر أن المتصفح برنامج لتصفح صفحات الويب.",
                  "Mozilla Firefox هو المتصفح بين الخيارات الثلاثة."],
    },
    # --- Islamic education, grade 1 primary (term 1) ---
    "P133-0003": {
        "kept_id": "X13-0007", "difficulty": "مبتدئ", "cognitive": "apply",
        "question": "وجدتَ قلمًا يخص زميلك على الأرض. ماذا تفعل؟",
        "choices": ["أحتفظ به لنفسي", "أرميه في سلة المهملات", "أُعيده إلى زميلي"], "answer_index": 2,
        "explanation": "احترام حقوق الآخرين يعني إعادة ما يخصهم إليهم.",
        "steps": ["نحدد صاحب القلم.", "نعيد القلم إلى صاحبه احترامًا لحقه."],
    },
    # --- Physical sciences, secondary: measurement / mass (term 1) ---
    "14-0034": {
        "kept_id": "P133-0081", "difficulty": "مبتدئ", "cognitive": "recall",
        "question": "ما وحدة قياس الكتلة في النظام الدولي للوحدات؟",
        "choices": ["الكيلوغرام", "النيوتن", "اللتر"], "answer_index": 0,
        "explanation": "الكيلوغرام (kg) هو وحدة الكتلة في النظام الدولي، أما النيوتن فوحدة القوة واللتر وحدة الحجم.",
        "steps": ["نحدد المقدار المقاس: الكتلة.", "وحدتها في النظام الدولي هي الكيلوغرام."],
    },
    "14-0193": {
        "kept_id": "P133-0091", "difficulty": "مبتدئ", "cognitive": "apply",
        "question": "كم كيلوغرامًا تساوي كتلة قدرها 3500 غرام؟",
        "choices": ["35 كغ", "0.35 كغ", "3.5 كغ"], "answer_index": 2,
        "explanation": "1 كغ = 1000 غ، إذن 3500 غ ÷ 1000 = 3.5 كغ.",
        "steps": ["نتذكر أن 1 كغ = 1000 غ.", "نقسم 3500 على 1000 فنجد 3.5 كغ."],
    },
    "14-0115": {
        "kept_id": "P133-0101", "difficulty": "متوسط", "cognitive": "apply",
        "question": "ما كتلة جسم قيمتها 0.5 كغ مُعبَّرًا عنها بالغرام؟",
        "choices": ["500 غ", "50 غ", "5000 غ"], "answer_index": 0,
        "explanation": "1 كغ = 1000 غ، إذن 0.5 كغ × 1000 = 500 غ.",
        "steps": ["نتذكر أن 1 كغ = 1000 غ.", "نضرب 0.5 في 1000 فنجد 500 غ."],
    },
    # --- Physics & technology, middle: circuits (term 2) ---
    "14-0068": {
        "kept_id": "14-0067", "difficulty": "متوسط", "cognitive": "apply",
        "question": "في دارة كهربائية بسيطة، ماذا يحدث للمصباح عند فتح القاطعة؟",
        "choices": ["يزداد توهجه", "ينطفئ لأن الدارة أصبحت مفتوحة", "يبقى مضيئًا"], "answer_index": 1,
        "explanation": "يمر التيار الكهربائي فقط في دارة مغلقة؛ فتح القاطعة يقطع الدارة فينطفئ المصباح.",
        "steps": ["نتذكر أن مرور التيار يتطلب دارة مغلقة.", "فتح القاطعة يفتح الدارة، فينقطع التيار وينطفئ المصباح."],
    },
    "14-0227": {
        "kept_id": "14-0226", "difficulty": "متوسط", "cognitive": "apply",
        "question": "ماذا نسمي الدارة التي يمر فيها التيار عبر مسار واحد يضم جميع العناصر الواحد تلو الآخر؟",
        "choices": ["دارة على التفرع", "دارة مفتوحة", "دارة على التسلسل"], "answer_index": 2,
        "explanation": "في الدارة على التسلسل توصل العناصر الواحد تلو الآخر في مسار واحد.",
        "steps": ["نحدد عدد مسارات التيار في الدارة: مسار واحد.", "هذا هو تعريف الدارة على التسلسل."],
    },
    "14-0149": {
        "kept_id": "14-0148", "difficulty": "متوسط", "cognitive": "apply",
        "question": "في دارة على التفرع تضم مصباحين، احترق أحد المصباحين. ماذا يحدث للمصباح الآخر؟",
        "choices": ["ينطفئ أيضًا", "يبقى مضيئًا", "يحترق هو الآخر"], "answer_index": 1,
        "explanation": "لكل مصباح فرع مستقل في دارة التفرع، فانقطاع فرع لا يوقف الفرع الآخر.",
        "steps": ["نتذكر أن لكل فرع مسارًا مستقلًا للتيار.", "المصباح السليم يبقى متصلًا بالمولد فيبقى مضيئًا."],
    },
    "14-0305": {
        "kept_id": "14-0304", "difficulty": "متوسط", "cognitive": "apply",
        "question": "ما شدة التيار المار في ناقل أومي مقاومته 10 Ω عند تطبيق توتر 20 V بين طرفيه؟",
        "choices": ["200 A", "0.5 A", "2 A"], "answer_index": 2,
        "explanation": "حسب قانون أوم: I = U ÷ R = 20 ÷ 10 = 2 A.",
        "steps": ["نكتب قانون أوم: I = U ÷ R.", "نعوّض: I = 20 ÷ 10 = 2 A."],
    },
    # --- Physics & technology, middle: electrical energy (term 3) ---
    "14-0069": {
        "kept_id": "14-0067", "difficulty": "متوسط", "cognitive": "apply",
        "question": "جهاز استطاعته 100 W يعمل مدة ساعتين. ما الطاقة الكهربائية التي يستهلكها؟",
        "choices": ["50 Wh", "200 Wh", "102 Wh"], "answer_index": 1,
        "explanation": "الطاقة = الاستطاعة × المدة، أي 100 W × 2 h = 200 Wh.",
        "steps": ["نكتب العلاقة: E = P × t.", "نعوّض: E = 100 × 2 = 200 Wh."],
    },
    "14-0228": {
        "kept_id": "14-0226", "difficulty": "متوسط", "cognitive": "apply",
        "question": "مصباح استطاعته 60 W يعمل مدة 5 ساعات. ما الطاقة الكهربائية التي يستهلكها بالواط ساعي؟",
        "choices": ["300 Wh", "65 Wh", "12 Wh"], "answer_index": 0,
        "explanation": "الطاقة = الاستطاعة × المدة، أي 60 W × 5 h = 300 Wh.",
        "steps": ["نكتب العلاقة: E = P × t.", "نعوّض: E = 60 × 5 = 300 Wh."],
    },
    "14-0150": {
        "kept_id": "14-0148", "difficulty": "متقدم", "cognitive": "apply",
        "question": "جهاز استطاعته 2 kW يعمل مدة 3 ساعات. كم كيلوواط ساعي (kWh) يستهلك؟",
        "choices": ["5 kWh", "1.5 kWh", "6 kWh"], "answer_index": 2,
        "explanation": "E = P × t = 2 kW × 3 h = 6 kWh.",
        "steps": ["نتأكد من أن الاستطاعة مقدرة بالكيلوواط والمدة بالساعة.", "نضرب: 2 × 3 = 6 kWh."],
    },
    "14-0306": {
        "kept_id": "14-0304", "difficulty": "متقدم", "cognitive": "analyze",
        "question": "إذا افترضنا أن سعر 1 kWh يساوي 5 دج، فكم تكلفة تشغيل جهاز استطاعته 1 kW مدة 4 ساعات؟",
        "choices": ["20 دج", "9 دج", "1.25 دج"], "answer_index": 0,
        "explanation": "الطاقة المستهلكة = 1 kW × 4 h = 4 kWh، والتكلفة = 4 × 5 = 20 دج.",
        "steps": ["نحسب الطاقة المستهلكة: 1 × 4 = 4 kWh.", "نضرب الطاقة في السعر: 4 × 5 = 20 دج."],
    },
}


# v1.11.1: the term-1 items of the four middle-school physics/technology pairs
# asked a generic "organised learning" question unrelated to the subject.
# They are replaced in place (ids kept) with questions on the stated topic
# (القياس / الكتلة ووحداتها).
GENERIC_REPLACEMENTS = {
    "14-0067": {
        "difficulty": "مبتدئ", "cognitive": "recall",
        "question": "أي أداة تُستخدم في المخبر لقياس كتلة جسم؟",
        "choices": ["المخبار المدرج", "الميزان", "المسطرة"], "answer_index": 1,
        "explanation": "الميزان هو الأداة المناسبة لقياس الكتلة، أما المخبار المدرج فيقيس الحجم والمسطرة تقيس الطول.",
        "steps": ["نحدد المقدار المطلوب قياسه: الكتلة.", "نختار الأداة المخصصة لقياسها: الميزان."],
    },
    "14-0226": {
        "difficulty": "مبتدئ", "cognitive": "apply",
        "question": "كم غرامًا تساوي كتلة قدرها 2.5 كغ؟",
        "choices": ["250 غ", "25 غ", "2500 غ"], "answer_index": 2,
        "explanation": "1 كغ = 1000 غ، إذن 2.5 كغ × 1000 = 2500 غ.",
        "steps": ["نتذكر أن 1 كغ = 1000 غ.", "نضرب 2.5 في 1000 فنجد 2500 غ."],
    },
    "14-0148": {
        "difficulty": "متوسط", "cognitive": "understand",
        "question": "ما العبارة الصحيحة حول الكتلة والوزن؟",
        "choices": ["الكتلة تُقاس بالنيوتن والوزن يُقاس بالكيلوغرام",
                    "الكتلة والوزن يُقاسان بالوحدة نفسها",
                    "الكتلة تُقاس بالكيلوغرام والوزن يُقاس بالنيوتن"],
        "answer_index": 2,
        "explanation": "الكتلة مقدار يقاس بالكيلوغرام، أما الوزن فهو قوة تقاس بالنيوتن.",
        "steps": ["نتذكر أن الوزن قوة والكتلة كمية من المادة.", "وحدة الكتلة الكيلوغرام ووحدة الوزن النيوتن."],
    },
    "14-0304": {
        "difficulty": "متوسط", "cognitive": "apply",
        "question": "ما كتلة جسم وزنه 100 N إذا اعتبرنا شدة الجاذبية g = 10 N/kg؟",
        "choices": ["1000 كغ", "10 كغ", "0.1 كغ"], "answer_index": 1,
        "explanation": "P = m × g، إذن m = P ÷ g = 100 ÷ 10 = 10 كغ.",
        "steps": ["نكتب العلاقة: P = m × g ومنها m = P ÷ g.", "نعوّض: m = 100 ÷ 10 = 10 كغ."],
    },
}
