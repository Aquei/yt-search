(function(){
	"use strict";

	var d = document;

	var version = "1.0.0";

	//yt-search.htmlドキュメント
	var od = (d._currentScript || d.currentScript).ownerDocument;

	var base = od.baseURI.replace(/\/[^\/]*$/, '');

	var prt = Object.create(HTMLElement.prototype);
	var entryPoint = "https://www.googleapis.com/youtube/v3/search";

 	//テンプレート
	var tmpl = od.querySelector(".yt-search");

	//video itemのテンプレート
	var vTmpl = od.querySelector(".video-item");


	//生成時のコールバック
	prt.createdCallback = function(){
		//init
		this._init();

		//set options
		//this._setOpt();

		//check
		//this._check();
	};

	//documentに追加された時のコールバック
	prt.attachedCallback = function(){
		//set options
		this._setOpt();

		//check
		this._check();
	};

	//documentから削除された時のコールバック
	prt.detachedCallback = function(){
		//コールバック用グローバル変数を削除しておく
		if("callback" in this._data.params && window.hasOwnProperty(this._data.params.callback)){
			delete window[this._data.params.callback];
		}
	};

	//属性値変更時のコールバック
	prt.attributeChangedCallback = function(attrName, oldVal, newVal){
		switch(attrName){
			case "data-shadow-dom":
				if(newVal === "off"){
					this._init();
				}
			case "data-params":
			case "data-query":
			case "data-max-results":
			case "data-api-key":
			case "data-play-btn-txt":
			case "data-playing-btn-txt":
			case "data-theme":
				//set options
				this._setOpt();

				//check
				this._check();

				break;
			default:
				return;
		}
	};


	//オプションを設定したり
	prt._setOpt = function(){
		var opts = {};
		var temp;
		if(this.hasAttribute("data-params")){
			try{
				opts = JSON.parse(this.getAttribute("data-params"));
			}catch(e){
				if(e instanceof SyntaxError){
					console.log("有効なJSONではないためdata-paramsの値を無視します");
				}else{
					throw e;
				}
			}
		}

		//検索キーワードを設定
		if(this.hasAttribute("data-query")){
			temp = this.getAttribute("data-query");
			if(temp){
				opts.q = temp;
			}else{
				console.error("検索キーワードが無効です");
			}
		}

		//最大件数
		if(this.hasAttribute("data-max-results")){
			temp = parseInt(this.getAttribute("data-max-results"));
			if(!isNaN(temp)){
				opts.maxResults = temp;
			}else{
				console.error("data-max-resultsの属性値が整数値表現ではないため無視します");
			}
		}

		//APIKey
		if(this.hasAttribute("data-api-key")){
			temp = this.getAttribute("data-api-key");
			if(temp){
				opts.key = temp;
			}else{
				console.error("data-api-keyの属性値が無効です");
			}
		}

		//デフォルト値
		//part = snippet
		if("part" in opts && opts.part){
		}else{
			opts.part = "snippet";
		}

		//type=video
		if("type" in opts && opts.type){
		}else{
			opts.type = "video";
		}

		//videoEmbeddable=true
		if("videoEmbeddable" in opts && ["true", "false"].indexOf(opts.videoEmbeddable.toString()) !== -1){
		}else{
			opts.videoEmbeddable = "true";
		}


		//オプションを設定する
		this._data.params = opts;
	}



		




	//動作に必要なオプション等が揃っているかチェック
	prt._check = function(){
		var opt = this._data.params;
		if(
				opt.q ||
				opt.key || 
				opt.part
		  ){
			//OKなのでリクエストしたり
			this._run();
		}
	}


	//init
	prt._init = function(){
		var root = (this.getAttribute("data-shadow-dom") !== "off")?this.createShadowRoot(): this;
		//インスタンス変数
		this._data = {
			params: {},
			queryCache: {},
			root: root,
		};
	};

	//dom build method
	prt._build = function(json){
		var doc = d.importNode(tmpl.content, true);
		var root = this._data.root;
		var cache;
		var that = this;
		var themeList = ["cerulean","cosmo","cyborg","darkly","flatly","journal","lumen","paper","readable","sandstone","simplex","slate","spacelab","superhero","united","yeti"];
	
		//初期化
		//shadowroot以下のelement全削除
		while(root.firstChild){
			root.removeChild(root.firstChild);
		}

		//テンプレートを突っ込む
		root.appendChild(doc);


		var ss = d.createElement("style");
		//スタイルシートを読み込む
		if(this.hasAttribute("data-theme") && themeList.indexOf(this.getAttribute("data-theme").toLowerCase()) !== -1){
			var themeName = this.getAttribute("data-theme").toLowerCase();
			ss.innerHTML = '@import url('+base+'/yt-search.'+themeName+'.css?v='+version+');';

			//属性をセット
			root.querySelector(".yt-search").setAttribute("data-theme", themeName);
		}else{
			//デフォルトスタイルシート
			ss.innerHTML = '@import url('+base+'/yt-search.css?v='+version+');';
		}
		
		root.insertBefore(ss, root.firstChild);



		//エレメントのキャッシュ
		//iframe
		this._data.queryCache.iframe = root.querySelector("iframe.embed-responsive-item");
		this._data.queryCache.vContainer = root.querySelector(".videos");


		//検索結果が0件ならアラートを表示して死ぬ
		//1件以上ならビデオ表示
		if(!json.items.length){
			root.querySelector(".alert").classList.remove("hidden");
			return;
		}else{
			root.querySelector(".embed-responsive").classList.remove("hidden");
			root.querySelector(".well.hidden").classList.remove("hidden");
		}

		//検索結果0番目のビデオをセット
		this.setVideo(json.items[0], false, false);

		//検索結果が2件以上ならリストを表示
		if(json.items.length > 1){
			//.hiddenをとる
			var listContainer = this._data.queryCache.vContainer;
			listContainer.classList.remove("hidden");

			var playBtnTxt = this.getAttribute("data-play-btn-txt") || "Play";

			for(var i=0,l=json.items.length; i<l; ++i){
				var itemTemplate = d.importNode(vTmpl.content, true);
				var videoItem = json.items[i];

				var thumbs = videoItem.snippet.thumbnails;
				var imgsrc;
			
				//最適な画像を探す
				if(thumbs.hasOwnProperty("high")){
					imgsrc = thumbs.high.url;
				}else if(thumbs.hasOwnProperty("medium")){
					imgsrc = thumbs.medium.url;
				}else{
					imgsrc = thumbs["default"].url;
				}

				//画像をセット
				itemTemplate.querySelector("img").setAttribute("src", imgsrc);

				//タイトルをセット
				itemTemplate.querySelector("h3").textContent = videoItem.snippet.title;

				//説明をセット
				itemTemplate.querySelector(".desc").textContent = videoItem.snippet.description;

				//再生ボタンをセット
				var btn = itemTemplate.querySelector("a.btn");
				btn.textContent = playBtnTxt;

				var playingBtnTxt = (this.hasAttribute("data-playing-btn-txt"))?this.getAttribute("data-playing-btn-txt"):"再生中";
				//再生用のイベントリスナ
				(function(videoItem, txt, txt2){
					if(btn.addEventListener){
						btn.addEventListener('click', function(){
							var cache = that._data.root.querySelector(".btn-success");
							if(cache){
								cache.classList.remove("btn-success");
								cache.classList.add("btn-primary");
								cache.textContent = txt2
							}

							this.classList.remove("btn-primary");
							this.classList.add("btn-success");
							this.textContent = txt;

							that.setVideo(videoItem, true);
						}, false);
					}else if(btn.attachEvent){
						btn.attachEvent('onclick', function(){
							this.classList.remove("btn-primary");
							this.classList.add("btn-success");
							this.textContent = txt;
							that.setVideo(videoItem, true);
						});
					}
				})(videoItem, playingBtnTxt, playBtnTxt);


				//containerに追加
				listContainer.appendChild(itemTemplate);
			}
		}
	}

	//ビデオを変更したりするmethod
	prt.setVideo = function(json, autoplay, scrollOff, theme){


		var ifr = this._data.queryCache.iframe;
		var embedUrl = "https://www.youtube.com/embed/";
		var videoId = json.id.videoId;

		autoplay = autoplay?1:0;
		if(["dark","light"].indexOf(theme) === -1){
			theme = "dark";
		}

		embedUrl += videoId + "?theme=" + theme + "&autoplay=" + autoplay;

		ifr.setAttribute("src", embedUrl);

		this.setAttribute("data-current-video-id", videoId);
		this.setAttribute("data-current-video-info", JSON.stringify(json));


		//動画の説明をセットする
		if(json.hasOwnProperty("snippet")){
			this._data.root.querySelector(".well h2").textContent = json.snippet.title;
			this._data.root.querySelector(".well p").textContent = json.snippet.description;
		}


		//もしスクロールが有効ならスクロールさせる
		//
		//see : http://blog.gospodarets.com/native_smooth_scrolling/
		//see : https://github.com/flesler/jquery.scrollTo


		if(this.getAttribute("data-scroll") === "on" && !scrollOff){
			var pos = this.getBoundingClientRect();
			var scrollOptions = {
				top: Math.round(pos.top),
				left: Math.round(pos.left),
				behavior: "smooth"
			};

			if('scrollBehavior' in document.documentElement.style){
				window.scrollTo(scrollOptions);
			}else if(window.jQuery && jQuery.scrollTo){
				jQuery(window).scrollTo({top:scrollOptions.top, left:scrollOptions.left})
			}else{
				window.scrollTo(scrollOptions.left, scrollOptions.top);
			}
		}
	}


	//run
	prt._run = function(){
		//書換えたり通信したり
	
		var that = this;

		var queryParamArray = [];
		var queryParams;

		var jsonpCallbackName;
		var jsonpCallback;

		var rScript = document.createElement("script");




		//jsonp用のコールバック
		jsonpCallback = function(json){
			that._build(json);
		}



		//コールバック関数のユニークな名前を探す
		for(var i=0; i<10000; ++i){
			jsonpCallbackName = "yt_search_jsonp_callback_"+i;
			if(!window.hasOwnProperty(jsonpCallbackName)){
				//グローバル変数にコールバック関数を当てる
				window[jsonpCallbackName] = jsonpCallback;

				//パラメータのコールバック名を設定する
				this._data.params.callback = jsonpCallbackName;

				//loopを抜ける
				break;
			}

			if(i===9999){
				throw "ユニークなコールバック関数が設定できません";
			}
		}



		//クエリパラメータを作る
		for(var prop in this._data.params){
			if(this._data.params.hasOwnProperty(prop)){
				queryParamArray.push(encodeURIComponent(prop)+"="+encodeURIComponent(this._data.params[prop]));
			}
		}

		queryParams = queryParamArray.join("&");


		//リクエストを発行する
		rScript.setAttribute("src", entryPoint+"?"+queryParams);
		document.querySelector("body").appendChild(rScript);
		
	};



	d.registerElement("yt-search", {prototype: prt});
})();
