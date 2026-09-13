async function ensureLogo() {
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = () =>
      reject(new Error("تعذر تحميل شعار وزارة التعليم في التقرير."));
    img.src = "/resources/moe-logo.png?v=" + Date.now();
  });
}
async function createPdf(kind, rows, s, target, cycleLabel) {
  if (!window.jspdf || !window.html2canvas)
    return toast("تعذر تحميل مكتبة PDF.");
  if (createPdf.busy) return toast("جارٍ تجهيز التقرير السابق…");
  createPdf.busy = true;
  toast("جارٍ تجهيز التقرير…");
  const root = document.createElement("div");
  root.className = "pdf-root";
  document.body.appendChild(root);
  try {
    await ensureLogo();
    await document.fonts.ready;
    const strip =
        '<div class="identity-strip"><i></i><i></i><i></i><i></i><i></i></div>',
      header = () =>
        `<div class="pdf-header"><div class="pdf-logo"><img src="/resources/moe-logo.png" alt="وزارة التعليم"></div><div class="pdf-org"><span>الجهة التعليمية</span><b>${esc(s.educationDept || "وزارة التعليم")}</b><em>${esc(s.schoolName || "—")}</em></div></div>${strip}`,
      footer = () =>
        `<div class="pdf-footer"><div class="pdf-footer-line"></div><div class="pdf-footer-content"><span class="pdf-footer-teacher">المعلمة: <b>${esc(s.teacherName || "—")}</b></span><span class="pdf-page-number"></span><span class="pdf-footer-principal">المديرة: <b>${esc(s.principalName || "—")}</b></span></div></div>`,
      page = (body) =>
        `<section class="pdf-page">${header()}<div class="pdf-body">${body}</div>${footer()}</section>`,
      meta = (count) =>
        `<div class="pdf-meta"><div><span>المادة</span><b>${esc(s.subject || "—")}</b></div><div><span>العام الدراسي</span><b>${esc(s.academicYear || "—")}</b></div><div><span>عدد الطالبات</span><b>${count}</b></div><div><span>المعلمة</span><b>${esc(s.teacherName || "—")}</b></div></div><div class="pdf-cycle">الدورة: <b>&nbsp;${esc(cycleLabel || "—")}</b></div>`;
    const groups = new Map();
    rows.forEach((r) => {
      const k = `${r.cycleId}|${r.gradeKey}|${r.classKey}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const roster = [];
    for (const g0 of groups.values()) {
      const g = [...g0].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "ar"),
      );
      for (let start = 0; start < g.length; start += 18) {
        const chunk = g.slice(start, start + 18),
          gp = Math.floor(start / 18) + 1,
          total = Math.ceil(g.length / 18);
        roster.push(
          page(
            `<div class="pdf-title"><h1>كشف تحديد نمط التعلّم (VARK)</h1><p>نتائج اختبار أنماط التعلّم — أداة مدرسية إرشادية</p></div>${meta(g.length)}<div class="pdf-scope"><span><b>الدورة:</b> ${esc(g[0].cycleLabel)} &nbsp; <b>الصف:</b> ${esc(g[0].grade)} &nbsp; <b>الفصل:</b> ${esc(g[0].className)}</span>${total > 1 ? `<span>صفحة المجموعة ${gp} من ${total}</span>` : ""}</div><table class="pdf-table"><thead><tr><th style="width:8%"><div class="pdf-cell">م</div></th><th style="width:35%"><div class="pdf-cell">اسم الطالبة</div></th><th class="v"><div class="pdf-cell">بصري</div></th><th class="a"><div class="pdf-cell">سمعي</div></th><th class="r"><div class="pdf-cell">قراءة/كتابة</div></th><th class="k"><div class="pdf-cell">حركي</div></th></tr></thead><tbody>${chunk
              .map((r, i) => {
                const mx = Math.max(r.V, r.A, r.R, r.K);
                return `<tr><td><div class="pdf-cell">${start + i + 1}</div></td><td><div class="pdf-cell">${esc(r.name)}</div></td>${["V", "A", "R", "K"].map((m) => `<td><div class="pdf-cell">${r[m] === mx ? "✓" : ""}</div></td>`).join("")}</tr>`;
              })
              .join(
                "",
              )}</tbody></table><p class="pdf-note">ملاحظة: عند تساوي أعلى الدرجات قد تظهر أكثر من علامة للطالبة.</p>`,
          ),
        );
      }
    }
    const d = stats(rows),
      top = topLabels(d),
      completion = Math.min(
        100,
        Math.round((rows.length / Math.max(target, 1)) * 100),
      ),
      pct = (m) => Math.round((d[m] / Math.max(rows.length, 1)) * 100),
      distTotal = Math.max(
        Object.values(d).reduce((a, b) => a + b, 0),
        1,
      ),
      probs = Object.values(d)
        .filter((n) => n > 0)
        .map((n) => n / distTotal),
      diversity = rows.length
        ? Math.round(
            (-probs.reduce((sum, p) => sum + p * Math.log(p), 0) /
              Math.log(4)) *
              100,
          )
        : 0,
      ag = new Map();
    rows.forEach((r) => {
      const k = `${r.cycleId}|${r.gradeKey}|${r.classKey}`;
      if (!ag.has(k)) ag.set(k, []);
      ag.get(k).push(r);
    });
    const groupTable = `<h2 class="pdf-section-title">تحليل حسب الصف والفصل</h2><table class="pdf-table pdf-group"><colgroup><col style="width:18%"><col style="width:10%"><col style="width:7%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:25%"></colgroup><thead><tr><th><div class="pdf-cell">الصف</div></th><th><div class="pdf-cell">الفصل</div></th><th><div class="pdf-cell">العدد</div></th><th><div class="pdf-cell">بصري</div></th><th><div class="pdf-cell">سمعي</div></th><th><div class="pdf-cell">قراءة/كتابة</div></th><th><div class="pdf-cell">حركي</div></th><th><div class="pdf-cell">الأكثر</div></th></tr></thead><tbody>${[
        ...ag.values(),
      ]
        .map((g) => {
          const gd = stats(g);
          return `<tr><td><div class="pdf-cell">${esc(g[0].grade)}</div></td><td><div class="pdf-cell"><bdi dir="rtl">${esc(g[0].className)}</bdi></div></td><td><div class="pdf-cell">${g.length}</div></td><td><div class="pdf-cell">${gd.V}</div></td><td><div class="pdf-cell">${gd.A}</div></td><td><div class="pdf-cell">${gd.R}</div></td><td><div class="pdf-cell">${gd.K}</div></td><td><div class="pdf-cell">${esc(topLabels(gd))}</div></td></tr>`;
        })
        .join("")}</tbody></table>`,
      analysis = page(
        `<div class="pdf-title"><h1>تحليل نتائج أنماط التعلّم</h1><p>تحليل تلقائي للاستجابات الفعلية ضمن فئات V / A / R / K</p></div>${meta(rows.length)}<div class="pdf-kpis"><div><span>الاستجابات</span><b>${rows.length}</b></div><div><span>نسبة الإنجاز</span><b>${completion}%</b></div><div><span>الأكثر ظهورًا</span><b>${esc(top)}</b></div><div><span>تنوع الأنماط</span><b>${diversity}%</b></div></div><h2 class="pdf-section-title">توزيع الأنماط</h2><div class="pdf-bars">${["V", "A", "R", "K"].map((m) => `<div class="pdf-bar-row"><b>${MODES[m]}</b><div class="pdf-bar"><i style="width:${pct(m)}%;background:${m === "V" ? "#07a869" : m === "A" ? "#3d7eb9" : m === "R" ? "#0da9a6" : "#c1b489"}"></i></div><b>${d[m]} • ${pct(m)}%</b></div>`).join("")}</div><p class="pdf-note">قد يتجاوز مجموع النسب 100% عند وجود تساوٍ في أعلى الدرجات؛ عندها تُحتسب الطالبة ضمن كل نمط متساوٍ في الصدارة.</p>${groupTable}<h2 class="pdf-section-title">قراءة تربوية وتوصيات</h2><ul class="pdf-list"><li>النمط الأكثر ظهورًا في البيانات الحالية هو «${esc(top)}» ضمن ${rows.length} استجابة.</li><li>يوصى بتنويع أنشطة التعلّم وعدم الاعتماد على قناة واحدة في تقديم المحتوى.</li><li>تستخدم النتائج لتحسين الممارسات التعليمية ولا تُعامل كتصنيف ثابت لقدرات الطالبة.</li><li>يفضل الجمع بين العناصر البصرية، الشرح والحوار، القراءة والكتابة، والتطبيق العملي وفق الهدف التعليمي.</li></ul>`,
      ),
      pages =
        kind === "roster"
          ? roster
          : kind === "analysis"
            ? [analysis]
            : [analysis, ...roster];
    root.innerHTML = pages.join("");
    await Promise.all([...root.querySelectorAll('img')].map(img => img.decode()));
    paginatePdf(root);
    const nodes = [...root.querySelectorAll(".pdf-page")];
    nodes.forEach(
      (n, i) =>
        (n.querySelector(".pdf-page-number").textContent =
          `${i + 1} / ${nodes.length}`),
    );
    const { jsPDF } = window.jspdf,
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    for (let i = 0; i < nodes.length; i++) {
      const canvas = await html2canvas(nodes[i], {
        scale: 2.2,
        backgroundColor: "#fff",
        useCORS: true,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
      });
      if (i) pdf.addPage("a4", "portrait");
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.94),
        "JPEG",
        0,
        0,
        210,
        297,
      );
    }
    pdf.save(
      kind === "roster"
        ? "كشف_تحديد_نمط_التعلم_VARK.pdf"
        : kind === "analysis"
          ? "تحليل_نتائج_أنماط_التعلم.pdf"
          : "التقرير_الشامل_لأنماط_التعلم.pdf",
    );
    toast("تم إنشاء ملف PDF.");
  } catch (e) {
    console.error(e);
    toast(e.message || "تعذر إنشاء ملف PDF.");
  } finally {
    root.remove();
    createPdf.busy = false;
  }
}

function paginatePdf(root) {
  for (let index = 0; index < root.children.length; index++) {
    if (index > 500) throw new Error('التقرير كبير جدًا؛ اختاري صفًا أو فصلًا محددًا.');
    const current = root.children[index], body = current.querySelector('.pdf-body');
    const bottom = current.querySelector('.pdf-footer').getBoundingClientRect().top - 18;
    let next = null, continuedTable = null;
    const continuation = () => {
      if (!next) {
        next = current.cloneNode(true);
        next.querySelector('.pdf-body').replaceChildren();
        current.after(next);
      }
      return next.querySelector('.pdf-body');
    };
    let moves = 0;
    while (body.getBoundingClientRect().bottom > bottom) {
      if (++moves > 10000) throw new Error('تعذر توزيع محتوى التقرير على الصفحات.');
      const last = body.lastElementChild;
      if (!last) break;
      const target = continuation();
      if (last.tagName === 'TABLE' && last.tBodies[0]?.rows.length > 1) {
        if (!continuedTable) {
          continuedTable = last.cloneNode(true);
          continuedTable.tBodies[0].replaceChildren();
          target.prepend(continuedTable);
        }
        continuedTable.tBodies[0].prepend(last.tBodies[0].lastElementChild);
      } else {
        if (body.children.length === 1) throw new Error('يوجد نص أطول من مساحة الصفحة؛ اختصري البيانات الطويلة.');
        target.prepend(last);
        continuedTable = null;
      }
    }
    // Keep section headings with their content rather than orphaned at the foot.
    if (next && body.lastElementChild?.matches('h2')) next.querySelector('.pdf-body').prepend(body.lastElementChild);
  }
}
