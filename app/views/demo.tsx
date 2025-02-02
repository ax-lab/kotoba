/**
 * @file Demo page for HTML styling
 *
 * Based on https://github.com/cbracco/html5-test-page
 */

import React from 'react'

const Demo = () => (
	<>
		<header role="banner">
			<h1>HTML5 Test Page</h1>
			<p>
				This is a test page filled with common HTML elements to be used to provide visual feedback whilst
				building CSS systems and frameworks.
			</p>
		</header>
		<nav role="navigation">
			<ul>
				<li>
					<a href="#text">Text</a>
					<ul>
						<li>
							<a href="#text__headings">Headings</a>
						</li>
						<li>
							<a href="#text__paragraphs">Paragraphs</a>
						</li>
						<li>
							<a href="#text__japanese">Japanese</a>
						</li>
						<li>
							<a href="#text__blockquotes">Blockquotes</a>
						</li>
						<li>
							<a href="#text__lists">Lists</a>
						</li>
						<li>
							<a href="#text__hr">Horizontal rules</a>
						</li>
						<li>
							<a href="#text__tables">Tabular data</a>
						</li>
						<li>
							<a href="#text__code">Code</a>
						</li>
						<li>
							<a href="#text__inline">Inline elements</a>
						</li>
						<li>
							<a href="#text__comments">HTML Comments</a>
						</li>
					</ul>
				</li>
				<li>
					<a href="#embedded">Embedded content</a>
					<ul>
						<li>
							<a href="#embedded__images">Images</a>
						</li>
						<li>
							<a href="#embedded__audio">Audio</a>
						</li>
						<li>
							<a href="#embedded__video">Video</a>
						</li>
						<li>
							<a href="#embedded__canvas">Canvas</a>
						</li>
						<li>
							<a href="#embedded__meter">Meter</a>
						</li>
						<li>
							<a href="#embedded__progress">Progress</a>
						</li>
						<li>
							<a href="#embedded__svg">Inline SVG</a>
						</li>
						<li>
							<a href="#embedded__iframe">IFrames</a>
						</li>
					</ul>
				</li>
				<li>
					<a href="#forms">Form elements</a>
					<ul>
						<li>
							<a href="#forms__input">Input fields</a>
						</li>
						<li>
							<a href="#forms__select">Select menus</a>
						</li>
						<li>
							<a href="#forms__checkbox">Checkboxes</a>
						</li>
						<li>
							<a href="#forms__radio">Radio buttons</a>
						</li>
						<li>
							<a href="#forms__textareas">Textareas</a>
						</li>
						<li>
							<a href="#forms__html5">HTML5 inputs</a>
						</li>
						<li>
							<a href="#forms__action">Action buttons</a>
						</li>
					</ul>
				</li>
			</ul>
		</nav>
		<main role="main">
			<section id="text">
				<header>
					<h1>Text</h1>
				</header>
				<article id="text__headings">
					<header>
						<h1>Headings</h1>
					</header>
					<div>
						<h1>Heading 1</h1>
						<h2>Heading 2</h2>
						<h3>Heading 3</h3>
						<h4>Heading 4</h4>
						<h5>Heading 5</h5>
						<h6>Heading 6</h6>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__paragraphs">
					<header>
						<h1>Paragraphs</h1>
					</header>
					<div>
						<p>
							A paragraph is a self-contained unit of a discourse in writing dealing with a particular
							point or idea. A paragraph consists of one or more sentences. Though not required by the
							syntax of any language, paragraphs are usually an expected part of formal writing, used to
							organize longer prose.
						</p>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__japanese">
					<header>
						<h1></h1>
					</header>
					<div lang="jp">
						<p>
							記済聞ウリモ強現ヱニ猛熊東ぱずほ現切ネヘ準規ヤウ暮5覧アミヌヨ法多権ぱ脊京おのらぴ心81施ムマヱノ真辺っわ返続イナニハ察講チラ載法ロソエ千伺ド。山ゆを統同車すな昇引っおレよ経価ぼね拓漂シト除萩ラせ拉同変ホネ女26紀識種文76長スラネサ絶子生陸犯ちわ。記レメタト止問だせ言教ヱケ首口うゅ明功つやが図意連ッゃ技用ゅ賀3会寺ふや朝現ょぜじた東前どか禁地蔵オラセ対副しけごッ。
						</p>
						<p>
							投サエホト援環技まっは災県ぶけば青3産っゅむさ掲試19音とざそ見負ぴいン意6名イヱツ刊過王拍リぞゃ。付庁キネサエ誌14超カモア選応ト点兆チツカ議決すぐ名任に表真ごルとろ員重7合ナニ究約ナヘヤホ焼事アユト連部上っ恨状ほンちぽ社後ッずド転理べふ格竜勝倒ら。聞れらわげ土自ゆくり更速りい樹黒新ラロメヒ対事ヲセステ材届検ルヌケメ団保棋フシロエ査樹ぜちル記出山アニナト億走スドづゅ他岩隆売じっめろ。
						</p>
						<p>
							影シメヨワ局39上撃けぴね外後可エマ野82富ばんっじ質取ばト覚両マヱタシ級鑑だづへい当通だじせり株74娘汁昇76山谷えわ。踏クる生地ヒ景内は線語コムホロ盧激敵り迫如るフす載体タ暮曲ラレツ覧写多浮イおぎ談属だそぐ人押ラて当大ぶにリゅ政見キコミニ多記使ナノ種始シ負反マ済亮凱孫ゆ。伝ツニコ況捕マ交南41水げぼ原高こイ献止昨レア内感シイハホ役左あつらを国頑め直増ょ愛端乏て。
						</p>
						<p>
							広ほフちぱ認48後イユ加写き池載ニ加個ぞ闘主のーにル菓武ぎ今卑をびッょ平観ソ詳反汁おめ備宿こじうぐ。難ミツヤ頭資世ヨネマシ政不チヱヨヲ応素ニ集8探づこの持校フ体示ひ勝貫変身75波あゅだ計必め録安た政稿オキヤリ疑荒衝びりんげ。当菓がね同都の止出テセ一以イトテ西沢ぼみは例住ホミソサ明保エユチサ圧下寄へたつの騰堀シムヌ芝代ヲ強安測品童っきりづ。
						</p>
						<p>
							8車意スケフレ等筑ホモ広増万球ーそ者理すだ聞報ぼぜせろ提守オ第静レげむ最新通ーぼじぽ半辞けイラ集避試ノ稿涯ユノシ読答ひてラ。5校タユ員味ざづ下術つろだぜ犯赦イテヲ調速ほり院彦タ感校タモヘ試文ほスゃ康次蔵仙旅ナキイウ厘社ドおす決人債核あ。58続響整椅63弘お種福と写造ばクうね写93一ヘモヨチ発遮シマヌ下秀ヒレ石印テフヲハ預輝のっ展価うべょ刑挙ふンけつ碁拘肌陶リ。
						</p>
						<p>
							右下ほれくよ意家ごふ快能関ニワ全停ラエハロ野5和しリもに治子約く摘更せごぴさ中育チラウタ済逮たけフ実東ヲタ省案シオユツ閉8高さびこ必分ケニ雲紙リ転承菱しとち。質16反ムツ勝条イて着候毛ユハア須5木ニヲテ近時ぴがーお供応だむ日心チ老固よわせッ父酒散欧署ねをぱわ。帳ず星著ま障情でリぞへ旅庫想官常れあ張産に計予マセヘ江補リイラ会68見セヤ全金リタヨイ秀女べし間幅前ワ池孝いンぶゅ。
						</p>
						<p>
							細発ケ勝無ヲヱ後球幅87記るル対一権ネ牧催定しスリへ発82迎ちずもゅ熱値式セサタレ見済いさで仰返ヒユソ囲張サ供区畑辞状たすちと。報げめい専玲りッっび弁検新ぴぱッね背半セヘ米覚ぶ山3国ぴルたげ遂画ん歩51協提レふえし棚名制やちッぶ稿当ユコエハ接生じよがク世議ヨテク建土ト望身管式トとふっ。
						</p>
						<p>
							約セマ内現ムハ選掛べ提木オテ細止ょざち聞庭がフらだ応良ぞば学注おはちれ刊思年ヱメエ市法げふな考8山記へてゆ続逃ッフ良国念トゆ亡串剱叩いクきラ。5聞ヲ人選ア害米回ね問作帖むぽ立64的ばやなえ載5楽イメキ意初ヤヱヲイ世相両健敷ょ。強シ広9公リニ型食じだ投創メマロ真報ぎフイ語異ムタオ康紙ヲノシイ公条いぱぼ国性ごうこよ県記ふけレ率図月芸スむん示試カ野製末了む。
						</p>
						<p>
							吸ぐぽぴむ旋白れずぐぴ像主関ヱヨ画属くわなフ月認ぼ受氏ソラカケ量法ゅちめね装3廃需14敢ど。血6三なこー委賞りょぽ情誌スくぎ新本エテカ車連トぱむへ兵根身ラ毎立シエア謝7時ねふみご存伊ヤイ上力八講お体易戒心漫こぴるの。権ナメミシ作圧サキホ告真ょぴん後31者ゃ配病まのみぽ国命作リろはち請月介リマ選読べばへ認開ネ止陸ヤキ参無ヒヘム更際ツラネ経削クコキタ間打わぽ最同ゅり件平ヲソオユ行久び。
						</p>
						<p>
							前ト比順けみル組寄ハルシヨ六来誓ノエコヘ一乾ろ属情平寄シルソナ手親誌さぴゆじ業断らきルそ重巡ッずス同水がば竹社ネイリ権晴津装ぐしレ。飯激けわ百幕エフヨソ考約ルわいぽ時代ネヲオ覧時健の主陳郎テ最年ヨヘケ洋査フタネ問文トユワ尚戦ユケヒヘ辺国フオリハ倉89続ッ由追フヱ焦荒衝ンほつル。17市フご禁認そで山45著てぜく幕世へ譲未ぎ村沙ゅ堅昨体ハナア水2駅ヒツ転士クがご英声阜掲田かほぱぎ。
						</p>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__blockquotes">
					<header>
						<h1>Blockquotes</h1>
					</header>
					<div>
						<blockquote>
							<p>
								A block quotation (also known as a long quotation or extract) is a quotation in a
								written document, that is set off from the main text as a paragraph, or block of text.
							</p>
							<p>
								It is typically distinguished visually using indentation and a different typeface or
								smaller size quotation. It may or may not include a citation, usually placed at the
								bottom.
							</p>
							<cite>
								<a href="#!">Said no one, ever.</a>
							</cite>
						</blockquote>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__lists">
					<header>
						<h1>Lists</h1>
					</header>
					<div>
						<h3>Definition list</h3>
						<dl>
							<dt>Definition List Title</dt>
							<dd>This is a definition list division.</dd>
						</dl>
						<h3>Ordered List</h3>
						<ol>
							<li>List Item 1</li>
							<li>List Item 2</li>
							<li>List Item 3</li>
						</ol>
						<h3>Unordered List</h3>
						<ul>
							<li>List Item 1</li>
							<li>List Item 2</li>
							<li>List Item 3</li>
						</ul>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__hr">
					<header>
						<h1>Horizontal rules</h1>
					</header>
					<div>
						<hr />
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__tables">
					<header>
						<h1>Tabular data</h1>
					</header>
					<table>
						<caption>Table Caption</caption>
						<thead>
							<tr>
								<th>Table Heading 1</th>
								<th>Table Heading 2</th>
								<th>Table Heading 3</th>
								<th>Table Heading 4</th>
								<th>Table Heading 5</th>
							</tr>
						</thead>
						<tfoot>
							<tr>
								<th>Table Footer 1</th>
								<th>Table Footer 2</th>
								<th>Table Footer 3</th>
								<th>Table Footer 4</th>
								<th>Table Footer 5</th>
							</tr>
						</tfoot>
						<tbody>
							<tr>
								<td>Table Cell 1</td>
								<td>Table Cell 2</td>
								<td>Table Cell 3</td>
								<td>Table Cell 4</td>
								<td>Table Cell 5</td>
							</tr>
							<tr>
								<td>Table Cell 1</td>
								<td>Table Cell 2</td>
								<td>Table Cell 3</td>
								<td>Table Cell 4</td>
								<td>Table Cell 5</td>
							</tr>
							<tr>
								<td>Table Cell 1</td>
								<td>Table Cell 2</td>
								<td>Table Cell 3</td>
								<td>Table Cell 4</td>
								<td>Table Cell 5</td>
							</tr>
							<tr>
								<td>Table Cell 1</td>
								<td>Table Cell 2</td>
								<td>Table Cell 3</td>
								<td>Table Cell 4</td>
								<td>Table Cell 5</td>
							</tr>
						</tbody>
					</table>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__code">
					<header>
						<h1>Code</h1>
					</header>
					<div>
						<p>
							<strong>Keyboard input:</strong> <kbd>Cmd</kbd>
						</p>
						<p>
							<strong>Inline code:</strong> <code>&lt;div&gt;code&lt;/div&gt;</code>
						</p>
						<p>
							<strong>Sample output:</strong> <samp>This is sample output from a computer program.</samp>
						</p>
						<h2>Pre-formatted text</h2>
						<pre>{`P R E F O R M A T T E D T E X T
! " # $ % & ' ( ) * + , - . /
0 1 2 3 4 5 6 7 8 9 : ; < = > ?
@ A B C D E F G H I J K L M N O
P Q R S T U V W X Y Z [ \\ ] ^ _
\` a b c d e f g h i j k l m n o
p q r s t u v w x y z { | } ~ `}</pre>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="text__inline">
					<header>
						<h1>Inline elements</h1>
					</header>
					<div>
						<p>
							<a href="#!">This is a text link</a>.
						</p>
						<p>
							<strong>Strong is used to indicate strong importance.</strong>
						</p>
						<p>
							<em>This text has added emphasis.</em>
						</p>
						<p>
							The <b>b element</b> is stylistically different text from normal text, without any special
							importance.
						</p>
						<p>
							The <i>i element</i> is text that is offset from the normal text.
						</p>
						<p>
							The <u>u element</u> is text with an unarticulated, though explicitly rendered, non-textual
							annotation.
						</p>
						<p>
							<del>This text is deleted</del> and <ins>This text is inserted</ins>.
						</p>
						<p>
							<s>This text has a strikethrough</s>.
						</p>
						<p>
							Superscript<sup>®</sup>.
						</p>
						<p>
							Subscript for things like H<sub>2</sub>O.
						</p>
						<p>
							<small>This small text is small for for fine print, etc.</small>
						</p>
						<p>
							Abbreviation: <abbr title="HyperText Markup Language">HTML</abbr>
						</p>
						<p>
							<q cite="https://developer.mozilla.org/en-US/docs/HTML/Element/q">
								This text is a short inline quotation.
							</q>
						</p>
						<p>
							<cite>This is a citation.</cite>
						</p>
						<p>
							The <dfn>dfn element</dfn> indicates a definition.
						</p>
						<p>
							The <mark>mark element</mark> indicates a highlight.
						</p>
						<p>
							The <var>variable element</var>, such as <var>x</var> = <var>y</var>.
						</p>
						<p>
							The time element: <time dateTime="2013-04-06T12:32+00:00">2 weeks ago</time>
						</p>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
			</section>
			<section id="embedded">
				<header>
					<h1>Embedded content</h1>
				</header>
				<article id="embedded__images">
					<header>
						<h2>Images</h2>
					</header>
					<div>
						<h3>
							No <code>&lt;figure&gt;</code> element
						</h3>
						<p>
							<img src="http://placekitten.com/480/480" alt="Image alt text" />
						</p>
						<h3>
							Wrapped in a <code>&lt;figure&gt;</code> element, no <code>&lt;figcaption&gt;</code>
						</h3>
						<figure>
							<img src="http://placekitten.com/420/420" alt="Image alt text" />
						</figure>
						<h3>
							Wrapped in a <code>&lt;figure&gt;</code> element, with a <code>&lt;figcaption&gt;</code>
						</h3>
						<figure>
							<img src="http://placekitten.com/420/420" alt="Image alt text" />
							<figcaption>Here is a caption for this image.</figcaption>
						</figure>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__audio">
					<header>
						<h2>Audio</h2>
					</header>
					<div>
						<audio controls>audio</audio>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__video">
					<header>
						<h2>Video</h2>
					</header>
					<div>
						<video controls>video</video>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__canvas">
					<header>
						<h2>Canvas</h2>
					</header>
					<div>
						<canvas>canvas</canvas>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__meter">
					<header>
						<h2>Meter</h2>
					</header>
					<div>
						<meter value="2" min="0" max="10">
							2 out of 10
						</meter>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__progress">
					<header>
						<h2>Progress</h2>
					</header>
					<div>
						<progress>progress</progress>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__svg">
					<header>
						<h2>Inline SVG</h2>
					</header>
					<div>
						<svg width="100px" height="100px">
							<circle cx="100" cy="100" r="100" fill="#1fa3ec"></circle>
						</svg>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
				<article id="embedded__iframe">
					<header>
						<h2>IFrame</h2>
					</header>
					<div>
						<iframe src="index.html" height="300"></iframe>
					</div>
					<footer>
						<p>
							<a href="#top">[Top]</a>
						</p>
					</footer>
				</article>
			</section>
			<section id="forms">
				<header>
					<h1>Form elements</h1>
				</header>
				<form>
					<fieldset id="forms__input">
						<legend>Input fields</legend>
						<p>
							<label htmlFor="input__text">Text Input</label>
							<input id="input__text" type="text" placeholder="Text Input" />
						</p>
						<p>
							<label htmlFor="input__password">Password</label>
							<input id="input__password" type="password" placeholder="Type your Password" />
						</p>
						<p>
							<label htmlFor="input__webaddress">Web Address</label>
							<input id="input__webaddress" type="url" placeholder="http://yoursite.com" />
						</p>
						<p>
							<label htmlFor="input__emailaddress">Email Address</label>
							<input id="input__emailaddress" type="email" placeholder="name@email.com" />
						</p>
						<p>
							<label htmlFor="input__phone">Phone Number</label>
							<input id="input__phone" type="tel" placeholder="(999) 999-9999" />
						</p>
						<p>
							<label htmlFor="input__search">Search</label>
							<input id="input__search" type="search" placeholder="Enter Search Term" />
						</p>
						<p>
							<label htmlFor="input__text2">Number Input</label>
							<input id="input__text2" type="number" placeholder="Enter a Number" />
						</p>
						<p>
							<label htmlFor="input__text3" className="error">
								Error
							</label>
							<input id="input__text3" className="is-error" type="text" placeholder="Text Input" />
						</p>
						<p>
							<label htmlFor="input__text4" className="valid">
								Valid
							</label>
							<input id="input__text4" className="is-valid" type="text" placeholder="Text Input" />
						</p>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
					<fieldset id="forms__select">
						<legend>Select menus</legend>
						<p>
							<label htmlFor="select">Select</label>
							<select id="select">
								<optgroup label="Option Group">
									<option>Option One</option>
									<option>Option Two</option>
									<option>Option Three</option>
								</optgroup>
							</select>
						</p>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
					<fieldset id="forms__checkbox">
						<legend>Checkboxes</legend>
						<ul className="list list--bare">
							<li>
								<label htmlFor="checkbox1">
									<input id="checkbox1" name="checkbox" type="checkbox" checked readOnly /> Choice A
								</label>
							</li>
							<li>
								<label htmlFor="checkbox2">
									<input id="checkbox2" name="checkbox" type="checkbox" /> Choice B
								</label>
							</li>
							<li>
								<label htmlFor="checkbox3">
									<input id="checkbox3" name="checkbox" type="checkbox" /> Choice C
								</label>
							</li>
						</ul>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
					<fieldset id="forms__radio">
						<legend>Radio buttons</legend>
						<ul className="list list--bare">
							<li>
								<label htmlFor="radio1">
									<input id="radio1" name="radio" type="radio" className="radio" checked readOnly />{' '}
									Option 1
								</label>
							</li>
							<li>
								<label htmlFor="radio2">
									<input id="radio2" name="radio" type="radio" className="radio" /> Option 2
								</label>
							</li>
							<li>
								<label htmlFor="radio3">
									<input id="radio3" name="radio" type="radio" className="radio" /> Option 3
								</label>
							</li>
						</ul>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
					<fieldset id="forms__textareas">
						<legend>Textareas</legend>
						<p>
							<label htmlFor="textarea">Textarea</label>
							<textarea id="textarea" rows={8} cols={48} placeholder="Enter your message here"></textarea>
						</p>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
					<fieldset id="forms__html5">
						<legend>HTML5 inputs</legend>
						<p>
							<label htmlFor="ic">Color input</label>
							<input type="color" id="ic" defaultValue="#000000" />
						</p>
						<p>
							<label htmlFor="in">Number input</label>
							<input type="number" id="in" min="0" max="10" defaultValue="5" />
						</p>
						<p>
							<label htmlFor="ir">Range input</label>
							<input type="range" id="ir" defaultValue="10" />
						</p>
						<p>
							<label htmlFor="idd">Date input</label>
							<input type="date" id="idd" defaultValue="1970-01-01" />
						</p>
						<p>
							<label htmlFor="idm">Month input</label>
							<input type="month" id="idm" defaultValue="1970-01" />
						</p>
						<p>
							<label htmlFor="idw">Week input</label>
							<input type="week" id="idw" defaultValue="1970-W01" />
						</p>
						<p>
							<label htmlFor="idt">Datetime input</label>
							<input type="datetime" id="idt" defaultValue="1970-01-01T00:00:00Z" />
						</p>
						<p>
							<label htmlFor="idt_l">Datetime-local input</label>
							<input type="datetime-local" id="idt_l" defaultValue="1970-01-01T00:00" />
						</p>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
					<fieldset id="forms__action">
						<legend>Action buttons</legend>
						<p>
							<input type="submit" value="<input type=submit>" />
							<input type="button" value="<input type=button>" />
							<input type="reset" value="<input type=reset>" />
							<input type="submit" value="<input disabled>" disabled />
						</p>
						<p>
							<button type="submit">&lt;button type=submit&gt;</button>
							<button type="button">&lt;button type=button&gt;</button>
							<button type="reset">&lt;button type=reset&gt;</button>
							<button type="button" disabled>
								&lt;button disabled&gt;
							</button>
						</p>
					</fieldset>
					<p>
						<a href="#top">[Top]</a>
					</p>
				</form>
			</section>
		</main>
		<footer role="contentinfo">
			<p>
				Based on <a href="http://github.com/cbracco/html5-test-page">GitHub</a>.
			</p>
		</footer>
	</>
)

export default Demo
