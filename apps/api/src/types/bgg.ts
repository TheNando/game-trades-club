// Auto-generated types for BoardGameGeek API responses.
// Many types are unused but kept for potential future use and documentation.
// Only GeekData, Item, and ItemLink are currently actively used.
/** Models a BoardGameGeek page response. */
export interface GeekData {
  item?: Item;
  media?: Media;
  videogalleries?: Videogalleries;
}

/** Models a BoardGameGeek item. */
export interface Item {
  'imageurl@2x': string;
  'alternatename': null;
  'alternatenames': Alternatename[];
  'alternatenamescount': number;
  'bggstore_product': string;
  'canonical_link': string;
  'cardsets': Cardsets;
  'classification_types': string[];
  'credit_subtypes': CreditSubtype[];
  'description': string;
  'focus_video': Video;
  'focus_videoid': string;
  'hide_collection_fields': string[];
  'honor_linktype': string;
  'honor_subtype': string;
  'howtoplay_videoid': null;
  'href': string;
  'id': string;
  'imageid': string;
  'imagepagehref': string;
  'images': ItemImages;
  'imageSets': ImageSets;
  'imageurl': string;
  'instructional_video': Video;
  'instructional_videoid': string;
  'itemdata': Itemdatum[];
  'itemid': number;
  'itemstate': Itemstate;
  'label': string;
  'labelpl': string;
  'linkcounts': { [key: string]: number };
  'linkedforum_types': LinkedforumType[];
  'links': Record<ItemLinkKey, ItemLink[]>;
  'maxplayers': string;
  'maxplaytime': string;
  'minage': string;
  'minplayers': string;
  'minplaytime': string;
  'name': string;
  'objectid': number;
  'objecttype': Objecttype;
  'override_rankable': number;
  'playthrough_video': Video;
  'playthrough_videoid': string;
  'polls': Polls;
  'primaryname': Primaryname;
  'promoted_ad': null;
  'rankinfo': Rankinfo[];
  'relatedcounts': Relatedcounts;
  'relatedlinktypes': string[];
  'reviews_restricted': number;
  'secondarynamescount': number;
  'short_description': string;
  'shortlabel': string;
  'shortlabelpl': string;
  'show_geekbuddy_analysis': boolean;
  'stats': Stats;
  'subtype': Subtype;
  'subtypename': string;
  'subtypes': Subtype[];
  'summary_video': Video;
  'summary_videoid': string;
  'targetco_url': string;
  'topimageurl': string;
  'type': string;
  'versioninfo': Versioninfo;
  'walmart_id': null;
  'website': Website;
  'wiki': string;
  'yearpublished': string;
}

/** Models a BoardGameGeek alternate name. */
export interface Alternatename {
  name: string;
  nameid: string;
}

/** Models BoardGameGeek card set metadata. */
export interface Cardsets {
  cardSets: CardSet[];
  hasBaseOrExpansionCardSets: boolean;
}

/** Models an individual BoardGameGeek card set. */
export interface CardSet {
  addon: boolean;
  cardTypes: CardType[];
  itemstate: Itemstate;
  linkid: string;
  linktype: string;
  name: null;
  notes: string;
  objectid: string;
  objecttype: Objecttype;
  postdate: Date;
  rep_imageid: string;
}

/** Models a BoardGameGeek card type. */
export interface CardType {
  height: string;
  itemstate: Itemstate;
  linkid: string;
  linktype: string;
  name: string;
  objectid: string;
  objecttype: string;
  postdate: Date;
  quantity_note: string;
  quantity: string;
  rep_imageid: string;
  width: string;
}

/** Enumerates BoardGameGeek item states. */
export enum Itemstate {
  Approved = 'approved',
}

/** Enumerates BoardGameGeek linked object types. */
export enum Objecttype {
  Company = 'company',
  Family = 'family',
  Person = 'person',
  Property = 'property',
  Thing = 'thing',
  Version = 'version',
}

/** Models a BoardGameGeek credit subtype. */
export interface CreditSubtype {
  $$hashKey: string;
  createsubtext?: string;
  datatype: Datatype;
  fullcredits: boolean;
  keyname: string;
  linktype: string;
  other_objecttype: Objecttype;
  other_subtype: string;
  schema?: Schema;
  self_prefix: SelfPrefix;
  title: string;
  titlepl: string;
  wiki_link: string;
}

/** Enumerates BoardGameGeek data types. */
export enum Datatype {
  GeekitemFielddata = 'geekitem_fielddata',
  GeekitemLinkdata = 'geekitem_linkdata',
  GeekitemPolldata = 'geekitem_polldata',
}

/** Models BoardGameGeek schema metadata. */
export interface Schema {
  itemprop: string;
  itemtype: string;
}

/** Enumerates BoardGameGeek self-reference prefixes. */
export enum SelfPrefix {
  Dst = 'dst',
  Src = 'src',
}

/** Models a BoardGameGeek video. */
export interface Video {
  blocks_ads: boolean;
  browse_href: string;
  canonical_link: string;
  description: string;
  descriptionXml: string;
  featured: boolean;
  featuredPlacementSponsored: boolean;
  gallery: string;
  hidden: boolean;
  href: string;
  id: string;
  language: Language;
  links: FocusVideoLink[];
  postdate: Date;
  source: Source;
  submitter: number;
  title: string;
  type: string;
  video: VideoClass;
  videoid: number;
}

/** Models a BoardGameGeek language. */
export interface Language {
  id: string;
  name: string;
  type: string;
}

/** Models a link associated with a BoardGameGeek video. */
export interface FocusVideoLink {
  rel: string;
  uri: string;
}

/** Models a BoardGameGeek content source. */
export interface Source {
  id: string;
  type: string;
}

/** Models BoardGameGeek video host details. */
export interface VideoClass {
  id: string;
  host: string;
}

/** Models BoardGameGeek image variants. */
export interface ImageSets {
  mediacard: Mediacard;
  square100: Mediacard;
}

/** Models a BoardGameGeek media card. */
export interface Mediacard {
  'src': string;
  'src@2x': string;
}

/** Models BoardGameGeek item image URLs. */
export interface ItemImages {
  micro: string;
  original: string;
  previewthumb: string;
  square: string;
  square200: string;
  tallthumb: string;
  thumb: string;
}

/** Models a BoardGameGeek item data definition. */
export interface Itemdatum {
  addnew?: boolean;
  adminonly?: boolean;
  alternate?: boolean;
  correctioncomment?: string;
  createposttext?: string;
  createtitle?: string;
  datatype: Datatype;
  display_inline?: boolean;
  editfieldsize?: number;
  fieldname?: string;
  fullcredits?: boolean;
  hidecontrols?: boolean;
  keyname: string;
  linktype?: string;
  loadlinks?: boolean;
  lookup_subtype?: string;
  maxlength?: number;
  nullable?: boolean;
  options?: Option[];
  other_is_dependent?: boolean;
  other_objecttype?: Objecttype;
  other_subtype?: string;
  overview_count?: number;
  polltype?: string;
  posttext?: string;
  primaryname?: boolean;
  required?: boolean;
  schema?: Schema;
  self_prefix?: SelfPrefix;
  showall_ctrl?: boolean;
  subtype?: Subtype;
  table?: string;
  title: string;
  titlepl?: string;
  unclickable?: boolean;
  validatemethod?: string;
  wiki_link?: string;
}

/** Models an option in a BoardGameGeek item definition. */
export interface Option {
  title: string;
  value: number;
}

/** Enumerates BoardGameGeek item subtypes. */
export enum Subtype {
  Boardgame = 'boardgame',
}

/** Models a BoardGameGeek linked forum type. */
export interface LinkedforumType {
  linkdata_index: string;
  linkedforum_index: string;
  required_subtype: null | string;
  title: string;
}

/** Names BoardGameGeek link collections on an item. */
export type ItemLinkKey =
  | 'boardgameaccessory'
  | 'boardgameartist'
  | 'boardgamecategory'
  | 'boardgamedesigner'
  | 'boardgamedeveloper'
  | 'boardgameeditor'
  | 'boardgameexpansion'
  | 'boardgamefamily'
  | 'boardgamegraphicdesigner'
  | 'boardgamehonor'
  | 'boardgameinsertdesigner'
  | 'boardgameintegration'
  | 'boardgamemechanic'
  | 'boardgamepublisher'
  | 'boardgamesculptor'
  | 'boardgamesolodesigner'
  | 'boardgamesubdomain'
  | 'boardgameversion'
  | 'boardgamewriter'
  | 'cardset'
  | 'containedin'
  | 'contains'
  | 'expandsboardgame'
  | 'reimplementation'
  | 'reimplements'
  | 'videogamebg';

/** Models a BoardGameGeek item link. */
export interface ItemLink {
  $$hashKey?: string;
  canonical_link: string;
  href: string;
  itemstate: Itemstate;
  name: null | string;
  objectid: string;
  objecttype: Objecttype;
  primarylink: number;
  sortindex: null | string;
}

/** Models BoardGameGeek item polls. */
export interface Polls {
  boardgameweight: Boardgameweight;
  languagedependence: string;
  playerage: string;
  subdomain: string;
  userplayers: Userplayers;
}

/** Models BoardGameGeek complexity poll results. */
export interface Boardgameweight {
  averageweight: number;
  votes: string;
}

/** Models BoardGameGeek player-count poll results. */
export interface Userplayers {
  best: Best[];
  recommended: Best[];
  totalvotes: string;
}

/** Models a BoardGameGeek poll range. */
export interface Best {
  max: number;
  min: number;
}

/** Models a BoardGameGeek primary name. */
export interface Primaryname {
  name: string;
  nameid: string;
  primaryname: string;
  sortindex: string;
  translit: string;
}

/** Models a BoardGameGeek rank entry. */
export interface Rankinfo {
  $$hashKey: string;
  baverage: string;
  browsesubtype: Subtype;
  prettyname: string;
  rank: string;
  rankobjectid: number;
  rankobjecttype: string;
  shortprettyname: string;
  subdomain: null | string;
  veryshortprettyname: string;
}

/** Models BoardGameGeek related-content counts. */
export interface Relatedcounts {
  blogs: number;
  news: number;
  podcast: number;
  weblink: number;
}

/** Models BoardGameGeek game statistics. */
export interface Stats {
  average: string;
  avgweight: string;
  baverage: string;
  numcomments: string;
  numfans: number;
  numgeeklists: string;
  numhasparts: string;
  numowned: string;
  numplays_month: string;
  numplays: string;
  numpreordered: string;
  numprevowned: string;
  numtrading: string;
  numwanting: string;
  numwantparts: string;
  numwanttobuy: string;
  numwanttoplay: string;
  numweights: string;
  numwish: string;
  numwishlistcomments: string;
  playmonth: string;
  stddev: string;
  usersrated: string;
  views: string;
}

/** Models BoardGameGeek version metadata. */
export interface Versioninfo {
  gamepageorderurl: null;
  shopifyitem: null;
}

/** Models a BoardGameGeek website link. */
export interface Website {
  title: string;
  url: string;
}

/** Models BoardGameGeek media metadata. */
export interface Media {
  files: Files;
  images: VideosClass;
  videos: VideosClass;
}

/** Models BoardGameGeek file counts. */
export interface Files {
  numitems: string;
}

/** Models BoardGameGeek media item counts. */
export interface VideosClass {
  numitems: number;
}

/** Models BoardGameGeek video galleries. */
export interface Videogalleries {
  galleries: Gallery[];
}

/** Models a BoardGameGeek gallery. */
export interface Gallery {
  name: string;
  type: string;
}

/** Models a BoardGameGeek album. */
export interface Album {
  artist: ArtistClass;
  name: string;
  tracks: Track[];
}

/** Models a BoardGameGeek album artist. */
export interface ArtistClass {
  founded: number;
  members: string[];
  name: string;
}

/** Models a BoardGameGeek album track. */
export interface Track {
  duration: number;
  name: string;
}
