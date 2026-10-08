export const news = [
  {
    id: 1,
    category: "Match Reports",
    title: "Dire Dawa City FC Secures Top Spot in City League",
    summary:
      "Dire Dawa City FC continues their dominant form with a 2-1 victory over Dire Dawa United, maintaining their position at the top of the league table.",
    author: "Tesfaye Bekele",
    date: "2025-06-16",
    image: "📰",
    content: `Dire Dawa City FC has confirmed their position at the top of the Dire Dawa City League with a hard-fought 2-1 victory over city rivals Dire Dawa United. The match, played at Dire Dawa Stadium in front of 15,000 fans, showcased the team's determination and tactical discipline.

Key moments included a brilliant strike from Musa Ahmed in the 34th minute, followed by Tadesse Bekele's assist to seal the victory. Dire Dawa United pulled one back late in the second half, but the home side held on for all three points.

With this win, DDC FC extends their unbeaten run to five matches and now sit 4 points clear at the top of the table.`,
  },
  {
    id: 2,
    category: "Dire Dawa",
    title: "Dire Dawa Youth League Expands to Eight Teams",
    summary:
      "The Dire Dawa Youth League has announced the addition of new clubs, bringing the total number of participating teams to eight for the 2025-26 season.",
    author: "Kebede Mesfin",
    date: "2025-06-15",
    image: "📰",
    content: `The Dire Dawa Youth League has announced a significant expansion, bringing the total number of participating teams to eight for the current season. This growth reflects the increasing interest in youth football development in the region.

New clubs have joined from various neighborhoods within Dire Dawa, providing young talents with more opportunities to showcase their skills and compete at a high level.`,
  },
  {
    id: 3,
    category: "Transfers",
    title: "Forward Yonas Fikru Attracts Interest from Higher League Clubs",
    summary:
      "Dire Dawa Rangers' prolific forward Yonas Fikru is reportedly being scouted by several clubs from the Ethiopian Higher League following his impressive goal-scoring form.",
    author: "Samuel Tefera",
    date: "2025-06-14",
    image: "📰",
    content: `Dire Dawa Rangers' star forward Yonas Fikru is generating significant interest from clubs in the Ethiopian Higher League. With 14 goals already this season, the 21-year-old has become one of the most sought-after young talents in the region.

Scouts from several Higher League clubs have been spotted at recent Dire Dawa matches, and sources close to the player confirm that discussions have taken place regarding a potential move.`,
  },
  {
    id: 4,
    category: "Clubs",
    title: "Dire Dawa Sport Club Announces New Stadium Partnership",
    summary:
      "Dire Dawa Sport Club has secured a new sponsorship deal that will fund the renovation of their training facilities ahead of the new season.",
    author: "Abera Girma",
    date: "2025-06-13",
    image: "📰",
    content: `Dire Dawa Sport Club has announced a new partnership that will provide funding for the renovation of their training facilities. The deal is expected to help the club attract better talent and improve their competitive edge in the upcoming season.`,
  },
  {
    id: 5,
    category: "Players",
    title: "Musa Ahmed Leads Race for Golden Boot",
    summary:
      "Dire Dawa City FC's Musa Ahmed tops the scoring charts with 18 goals, putting him on track to win the Golden Boot award for the season.",
    author: "Tesfaye Bekele",
    date: "2025-06-12",
    image: "📰",
    content: `Dire Dawa City FC striker Musa Ahmed leads the scoring charts with 18 goals this season, putting him in strong contention for the Golden Boot award. The 24-year-old forward has been in exceptional form, scoring in five consecutive matches.`,
  },
]

export const getNews = () => news
export const getNewsById = (id) => news.find((n) => n.id === Number(id))