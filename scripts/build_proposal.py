from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

OUTPUT = r'F:\Work\Brands\Vik\kasuku_proposal_vic_munala_phase2.pdf'

GREEN = colors.HexColor('#00B140')
BLACK = colors.HexColor('#0D0D0D')
GREY  = colors.HexColor('#6B6B6B')
LGREY = colors.HexColor('#F4F4F2')
WHITE = colors.white

def s(name, **kw):
    base = dict(fontName='Helvetica', fontSize=10, leading=15, textColor=BLACK, spaceAfter=0, spaceBefore=0)
    base.update(kw)
    return ParagraphStyle(name, **base)

doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=16*mm, bottomMargin=16*mm)

story = []

# PAGE 1 — COVER
story.append(Paragraph('Kasuku Studio', s('a', fontSize=9, textColor=GREY)))
story.append(Paragraph('Web Design for Kenyan Businesses', s('b', fontSize=9, textColor=GREY)))
story.append(Spacer(1, 8*mm))
story.append(HRFlowable(width='100%', thickness=0.5, color=LGREY))
story.append(Spacer(1, 10*mm))
story.append(Paragraph('WEBSITE PROPOSAL - AUGUST 2026', s('c', fontSize=8, textColor=GREEN, fontName='Helvetica-Bold')))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('Phase 1 is done, Vic.', s('d', fontSize=28, fontName='Helvetica-Bold', leading=34)))
story.append(Spacer(1, 3*mm))
story.append(Paragraph('Your site is live at thevillagersnotes.com. This proposal covers everything we delivered in Phase 1, what you owe for that work, and what Phase 2 adds next.', s('e', fontSize=11, textColor=GREY, leading=16)))
story.append(Spacer(1, 10*mm))

meta = [
    [Paragraph('LIVE SITE', s('ml', fontSize=8, textColor=GREY)), Paragraph('PREPARED FOR', s('ml2', fontSize=8, textColor=GREY)), Paragraph('DATE', s('ml3', fontSize=8, textColor=GREY)), Paragraph('PHASE 1 BALANCE DUE', s('ml4', fontSize=8, textColor=GREY))],
    [Paragraph('thevillagersnotes.com', s('mv', fontSize=12, fontName='Helvetica-Bold')), Paragraph('Vic Munala', s('mv2', fontSize=12, fontName='Helvetica-Bold')), Paragraph('August 2026', s('mv3', fontSize=12, fontName='Helvetica-Bold')), Paragraph('KSh 9,000', s('mv4', fontSize=12, fontName='Helvetica-Bold', textColor=GREEN))],
]
t = Table(meta, colWidths=[47*mm, 40*mm, 35*mm, 48*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), LGREY),
    ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 3*mm))
story.append(Paragraph('Confidential - For Vic Munala only', s('conf', fontSize=8, textColor=GREY, alignment=TA_RIGHT)))
story.append(PageBreak())

# PAGE 2 — PHASE 1 DELIVERABLES
story.append(Paragraph('01 - PHASE 1', s('sn', fontSize=8, textColor=GREEN, fontName='Helvetica-Bold')))
story.append(Paragraph('What we delivered.', s('sh', fontSize=18, fontName='Helvetica-Bold', leading=22)))
story.append(Spacer(1, 2*mm))
story.append(Paragraph('Everything below is live right now at thevillagersnotes.com. You own the code outright - no platform, no monthly subscription, no lock-in.', s('sb', fontSize=10, leading=16, textColor=GREY)))
story.append(Spacer(1, 6*mm))

deliverables = [
    ('The complete website - 5 pages', 'Home with your quote front-and-centre. Entries archive with filters, reading time, and scroll progress. Projects page for your novel and play. Book ordering page. All your real content loaded in.'),
    ('Cloud-powered publishing', 'Every essay you write from the admin panel goes live instantly on every browser and every device - not just yours. Your writing now lives in the cloud, not on a single computer.'),
    ('Secure paid article paywall', 'Readers pay to unlock individual essays via M-Pesa. The full story is stored securely - no reader can access it without a confirmed payment. Works the same on every browser, every phone.'),
    ('Private author admin', 'A password-protected page where you can write and publish new entries, edit past ones, update book details, and track your readers - all without touching any code.'),
    ('Book orders via M-Pesa', 'Readers fill the form, M-Pesa prompts their phone, they enter their PIN. Delivery details are captured automatically.'),
    ('Newsletter signup', 'Readers enter their email to follow your work. Every subscriber is logged to your private list.'),
    ('Your own domain', 'thevillagersnotes.com is live with a full SSL certificate - the padlock, the professional address.'),
    ('Google Analytics', 'Traffic, readers, where they come from, what they read - all tracked from day one.'),
    ('Google indexing', 'Your site is registered with Google Search Console and the sitemap submitted. Google is already crawling your pages.'),
    ('Social sharing previews', 'When someone shares any page on WhatsApp or X, it shows your title, your excerpt, and your book cover - not a blank link.'),
    ('Security hardening', 'Industry-standard headers are in place. Your paid content cannot be accessed by bypassing the payment - verified on the server before anything is revealed.'),
]

for title, body in deliverables:
    story.append(Paragraph(title, s('ih', fontSize=11, fontName='Helvetica-Bold', spaceBefore=4)))
    story.append(Paragraph(body, s('ib', fontSize=10, leading=15, textColor=GREY)))
    story.append(HRFlowable(width='100%', thickness=0.3, color=LGREY, spaceAfter=4))

story.append(PageBreak())

# PAGE 3 — PHASE 2
story.append(Paragraph('02 - PHASE 2', s('sn2', fontSize=8, textColor=GREEN, fontName='Helvetica-Bold')))
story.append(Paragraph('What we build next.', s('sh2', fontSize=18, fontName='Helvetica-Bold', leading=22)))
story.append(Spacer(1, 2*mm))
story.append(Paragraph('Phase 1 gave you the full site. Phase 2 makes the business side run itself - so you spend your time writing, not managing.', s('sb2', fontSize=10, leading=16, textColor=GREY)))
story.append(Spacer(1, 6*mm))

phase2 = [
    ('Newsletter that actually sends', 'Right now subscribers are captured but the emails go nowhere. We wire up a proper delivery system so you can email your readers when a new essay drops - from a real email address, not a form tool.'),
    ('Paid M-Pesa - your Till, not ours', 'The M-Pesa payments on your site currently go through our test account. We migrate this to your own Safaricom Till or Paybill number so every shilling lands directly in your account.'),
    ('Subscriber and order records saved permanently', 'Right now if someone clears a browser, records can disappear. We move these to the same secure cloud database your articles use - permanent, exportable, yours forever.'),
    ('Proper admin login', 'The current admin uses a shared password. We replace it with a proper login - your email and a password you set yourself - so only you can get in, from any device, at any time.'),
    ('Final security pass', 'A last database check to make sure no one can access your paid content by going around the payment. Belt and suspenders.'),
]

for title, body in phase2:
    story.append(Paragraph(title, s('p2h', fontSize=11, fontName='Helvetica-Bold', spaceBefore=4)))
    story.append(Paragraph(body, s('p2b', fontSize=10, leading=15, textColor=GREY)))
    story.append(HRFlowable(width='100%', thickness=0.3, color=LGREY, spaceAfter=4))

story.append(PageBreak())

# PAGE 4 — INVESTMENT
story.append(Paragraph('03 - INVESTMENT', s('sn3', fontSize=8, textColor=GREEN, fontName='Helvetica-Bold')))
story.append(Paragraph('What this costs.', s('sh3', fontSize=18, fontName='Helvetica-Bold', leading=22)))
story.append(Spacer(1, 2*mm))
story.append(Paragraph('Phase 1 was scoped at KSh 20,000. The deposit of KSh 10,000 was paid upfront. The remaining KSh 9,000 is due now that the site is live and in your hands.', s('sb3', fontSize=10, leading=16, textColor=GREY)))
story.append(Spacer(1, 6*mm))

cw = [130*mm, 40*mm]
def trow(l, r, bold=False, color_l=BLACK, color_r=BLACK, bg=None):
    ls = s('tl', fontSize=9, leading=13, textColor=color_l, fontName='Helvetica-Bold' if bold else 'Helvetica')
    rs = s('tr', fontSize=9, leading=13, textColor=color_r, fontName='Helvetica-Bold' if bold else 'Helvetica', alignment=TA_RIGHT)
    return [Paragraph(l, ls), Paragraph(r, rs)]

p1_rows = [
    trow('PHASE 1 - WHAT WAS BUILT', 'VALUE', bold=True),
    trow('Full website - 5 pages\nHome, Entries, Projects, Book, Admin', 'KSh 12,000'),
    trow('M-Pesa payments\nSTK push for book orders and paid articles', 'KSh 5,000'),
    trow('Cloud database, admin, paywall security\nSupabase integration, server-side payment verification', 'KSh 4,000'),
    trow('Domain, analytics, and SEO\nthevillagersnotes.com, Google Analytics, Search Console', 'KSh 2,000'),
    trow('Design credit (design is yours - we did not charge for what we did not do)', '- KSh 4,000', color_l=GREY, color_r=GREY),
    trow('Total Phase 1', 'KSh 20,000', bold=True),
    trow('Deposit paid', '- KSh 10,000', color_l=GREY, color_r=GREY),
    trow('BALANCE DUE NOW', 'KSh 9,000', bold=True),
]

p1_style = TableStyle([
    ('BACKGROUND', (0,0), (-1,0), BLACK),
    ('TEXTCOLOR', (0,0), (-1,0), WHITE),
    ('BACKGROUND', (0,-1), (-1,-1), GREEN),
    ('TEXTCOLOR', (0,-1), (-1,-1), WHITE),
    ('LINEBELOW', (0,1), (-1,-2), 0.3, colors.HexColor('#E0E0E0')),
    ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
])
t1 = Table(p1_rows, colWidths=cw)
t1.setStyle(p1_style)
story.append(t1)
story.append(Spacer(1, 6*mm))

p2_rows = [
    trow('PHASE 2 - WHAT COMES NEXT', 'VALUE', bold=True),
    trow('Newsletter delivery system\nWire up real email sends to your subscriber list', 'KSh 2,000'),
    trow('M-Pesa migration to your account\nMove payments to your own Till or Paybill', 'KSh 3,000'),
    trow('Permanent subscriber and order records\nMove reader list and orders to secure cloud storage', 'KSh 2,000'),
    trow('Proper admin login\nReplace shared password with your own email and password', 'KSh 2,000'),
    trow('Security final pass\nDatabase lock-down and last vulnerability check', 'KSh 1,000'),
    trow('PHASE 2 TOTAL', 'KSh 10,000', bold=True),
]
t2 = Table(p2_rows, colWidths=cw)
t2.setStyle(p1_style)
story.append(t2)
story.append(PageBreak())

# PAGE 5 — PAYMENT
story.append(Paragraph('04 - PAYMENT', s('sn4', fontSize=8, textColor=GREEN, fontName='Helvetica-Bold')))
story.append(Paragraph('Two things. Pay in order.', s('sh4', fontSize=18, fontName='Helvetica-Bold', leading=22)))
story.append(Spacer(1, 6*mm))

pay = [
    [Paragraph('NOW - PHASE 1 BALANCE', s('ph1', fontSize=9, fontName='Helvetica-Bold', textColor=WHITE)),
     Paragraph('AFTER - PHASE 2 DEPOSIT', s('ph2', fontSize=9, fontName='Helvetica-Bold', textColor=BLACK))],
    [Paragraph('KSh 9,000', s('pa1', fontSize=24, fontName='Helvetica-Bold', textColor=WHITE)),
     Paragraph('KSh 5,000', s('pa2', fontSize=24, fontName='Helvetica-Bold', textColor=BLACK))],
    [Paragraph('Clears Phase 1. The site is yours, fully handed over.', s('pd1', fontSize=9, textColor=WHITE, leading=13)),
     Paragraph('Kicks off Phase 2. Balance of KSh 5,000 on completion.', s('pd2', fontSize=9, textColor=GREY, leading=13))],
    [Paragraph('M-Pesa: +254 713 812 392\nScreenshot via WhatsApp or Signal.', s('pi1', fontSize=9, textColor=WHITE, leading=14)),
     Paragraph('M-Pesa: +254 713 812 392\nScreenshot via WhatsApp or Signal.', s('pi2', fontSize=9, textColor=GREY, leading=14))],
]
tp = Table(pay, colWidths=[85*mm, 85*mm])
tp.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,-1), GREEN),
    ('BACKGROUND', (1,0), (1,-1), LGREY),
    ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))
story.append(tp)
story.append(Spacer(1, 8*mm))

story.append(Paragraph('05 - WHAT WE NEED FROM YOU FOR PHASE 2', s('sn5', fontSize=8, textColor=GREEN, fontName='Helvetica-Bold')))
story.append(Spacer(1, 2*mm))
story.append(Paragraph('Two things and we start.', s('sh5', fontSize=14, fontName='Helvetica-Bold', leading=18)))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('1. Your Safaricom Till or Paybill number', s('n1h', fontSize=11, fontName='Helvetica-Bold')))
story.append(Paragraph('So we can move payments directly to your account. If you have a Till number already, great. If not, we can advise on how to get one - it is free and takes a day.', s('n1b', fontSize=10, leading=15, textColor=GREY)))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('2. Phase 2 deposit - KSh 5,000 via M-Pesa', s('n2h', fontSize=11, fontName='Helvetica-Bold')))
story.append(Paragraph('Send to +254 713 812 392. WhatsApp or Signal the screenshot and we get started within 24 hours.', s('n2b', fontSize=10, leading=15, textColor=GREY)))
story.append(Spacer(1, 6*mm))
story.append(HRFlowable(width='100%', thickness=0.5, color=LGREY))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('YOUR ADMIN LOGIN - READY NOW', s('al', fontSize=8, textColor=GREY, fontName='Helvetica-Bold')))
story.append(Spacer(1, 1*mm))
story.append(Paragraph('thevillagersnotes.com/#/admin     Password: Villager@2026!', s('alv', fontSize=10, fontName='Helvetica-Bold')))
story.append(PageBreak())

# PAGE 6 — BACK COVER
story.append(Spacer(1, 30*mm))
story.append(Paragraph('"Built to last. Owned by you."', s('q', fontSize=13, fontName='Helvetica-BoldOblique', leading=20, alignment=TA_CENTER)))
story.append(Spacer(1, 20*mm))
story.append(HRFlowable(width='60%', thickness=0.5, color=LGREY))
story.append(Spacer(1, 8*mm))
story.append(Paragraph('WhatsApp: +254 713 812 392', s('f1', fontSize=9, textColor=GREY, alignment=TA_CENTER)))
story.append(Paragraph('Instagram: @kasukustudio', s('f2', fontSize=9, textColor=GREY, alignment=TA_CENTER)))
story.append(Paragraph('Nairobi &amp; Nakuru, Kenya', s('f3', fontSize=9, textColor=GREY, alignment=TA_CENTER)))
story.append(Spacer(1, 6*mm))
story.append(Paragraph('Ian Ochieng', s('ian', fontSize=10, fontName='Helvetica-Bold', alignment=TA_CENTER)))
story.append(Paragraph('Founder &amp; CEO - Kasuku Studio', s('iansub', fontSize=9, textColor=GREY, alignment=TA_CENTER)))

doc.build(story)
print('DONE:', OUTPUT)
