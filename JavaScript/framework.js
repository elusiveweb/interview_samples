/**
 * <p><strong>FW - eDetail Presentation Framework</strong></p>
 *
 * <p>This global object encapsulates all variables and methods
 * used within the framework and acts as a namespace.</p>
 *
 * @author <a href="mailto:roger.soucy@havashealth.com">Roger Soucy</a>
 * @version 1.4.000
 *
 * @requires Zepto or jQuery
 * @type {Object}
 * @param {Object} FW Self Reference
 * @param {object} $ Zepto or jQuery Object
 * @name FW
 * @namespace com.havashealth.edetail.framework
 */
(function(FW, $, undefined)
{/** @lends FW */

	/**
	 * - Stores references to the DOM elements used for
	 * screen swapping as well as the active screen
	 */
	var _display = {
		"current" : 0,
		"screens" : []
	};

	/** - Stores the current segmentation path */
	var _path     = false;

	/** - Stores the current segmentation path position */
	var _path_pos = 0;

	/** - Stores the current page id */
	var _page_id  = false;

	/** - Flag used to indate when in a locked section */
	var _locked   = false;

	/** - collection of callbacks for page loads */
	var _callbacks = {};

	/** - Used to default click events to touches on iPad */
	FW.clickEvent = ("createTouch" in document) ? "touchend" : "click";

	/**
	 * <p><strong>Framework Settings</strong></p>
	 *
	 * <p>Note: Do not change these values here, override them in the main
	 * HTML file to avoid caching issues</p>
	 *
	 * @class
	 * @memberOf FW
	 * @property {boolean} [debug=false]
	 *   - Whether or not to enable debug console
	 * @property {boolean} [preload=false]
	 *   - Whether or not to preload the next page in the path
	 * @property {string} [primary="splash"]
	 *   - Initial slide to load (must be in the sitemap)
	 * @property {string} [transition="R2L"]
	 *   - Default page transition for navigation (see FW.loadPage)
	 * @property {string} [swipepath="default"]
	 *   - Default segmentation path
	 * @property {boolean} [locknav=false]
	 *   - Whether or not to lock the navigation menu when locked
	 */
	FW.SETTINGS = {
		"debug"      : false,
		"preload"    : false,
		"primary"    : "splash",
		"transition" : "R2L",
		"swipepath"  : "default",
		"locknav"    : true
	};

	/**
	 * <p><strong>Slides JS Loaded</strong></p>
	 *
	 * <p>Set FW.SLIDESJS = true; at the end of slides.js or else
	 * framework will not work (initialization requires this)</p>
	 */
	FW.SLIDESJS =  false;


	/**
	 * <p><strong>Call Framework Initialization</strong></p>
	 *
	 * <p>Looks for slides.js to be loaded (as set by FW.SLIDESJS = true)
	 * and initializes framework, otherwise delays for 100 ms and retries</p>
	 * <p>Note: You MUST set FW.SLIDESJS = true at the end of slides.js or
	 * the framework will not load!</p>
	 */
	FW.INIT = function()
	{
		/* DEBUG */ FW.LOG('DEBUG MODE ON!!!!!!!');

		if(!FW.SLIDESJS)
		{
			/* DEBUG */ FW.LOG('slides.js not loaded, delaying initialization');
			setTimeout(FW.INIT, 100);
		}
		else
		{
			/* DEBUG */ FW.LOG('Calling framework initialization');
			init();
		}
	}


	/**
	 * <p><strong>Framework Initialization</strong></p>
	 *
	 * <p>Loads the sitemap and calls buildMenu, then sets up basic
	 * touch events and navigation button events</p>
	 * <p>Note:
	 */
	var init = function()
	{
		/* DEBUG */ FW.LOG('Starting initialization...');

		// Lock the presentation from overscroll
		document.addEventListener('touchmove', function(e) { e.preventDefault(); }, false);
		$('.scrollable').on('touchmove', function(e) { e.stopPropagation(); });

		if(FW.SETTINGS.debug) { $('body').addClass('debug'); }

		$.ajaxSettings.cache = false;

		_display.screens = [
			document.getElementById('screen1'),
			document.getElementById('screen2')
		];

		_path = FW.SETTINGS.swipepath;

		/* DEBUG */ FW.LOG('Loading Sitemap JSON');
		// Load the sitemap content and display first page
		$.ajax({ type: 'GET', url: 'js/sitemap.json', dataType: 'json', timeout: 300,
			error: function(xhr, type, e)
			{
				/* DEBUG */ FW.LOG("Sitemap load error: Ajax Request Timed Out");
				FW.INIT();
			},
			success: function(data)
			{
				if(!data || data.length < 1)
				{
					/* DEBUG */ FW.LOG("Sitemap load error: Response is Empty");
					return false;
				}
				else
				{
					/* DEBUG */ FW.LOG("Sitemap loaded");
				}

				FW.SITEMAP.pages   = data.sitemap.pages     || [];
				FW.SITEMAP.buttons = data.sitemap.buttonbar || [];
				FW.SITEMAP.paths   = data.sitemap.paths     || {};
				FW.SITEMAP.loaded  = true;

				/* DEBUG */ FW.LOG("Setting default swipe path");
				FW.SITEMAP.setPath(FW.SETTINGS.swipepath);

				/* DEBUG */ FW.LOG("Creating Page index");
				FW.SITEMAP.createIndex(FW.SITEMAP.pages);

				/* DEBUG */ FW.LOG("Building Navigation");
				$('#navigation').append(FW.NAV.generate(FW.SITEMAP.pages, 0, 'nav-', true, false, true));

				/* DEBUG */ FW.LOG("Building Table of Contents");
				$('#toc').append(FW.NAV.generate(FW.SITEMAP.pages, 0, 'toc-'));

				/* DEBUG */ FW.LOG("Building Button Bar");
				$('#buttonbar').append(FW.NAV.buttonBar(FW.SITEMAP.buttons));

				/* DEBUG */ FW.LOG("Loading Default Page");
				FW.PAGE.load(FW.SETTINGS.primary, 'FADE');
			}
		});

		// Toggle the navigation menu when nav button is clicked
		$('#navbutton').on(FW.clickEvent, function(e)
		{
			e.preventDefault();
			FW.NAV.toggle();
			return false;
		});

		// Hide the navigation menu if touched outside
		$('#screens').on(FW.clickEvent, function(e) { FW.NAV.hide(); });

		// Hide the popup if overlay is touched
		$('#lb_overlay, #lb_close').on(FW.clickEvent, function(e)
		{
			e.preventDefault();
			FW.LIGHTBOX.hide(e);
			return false;
		});

		// Allow access to Debug Console
		if(FW.SETTINGS.debug)
		{
			$('#console_tab').on(FW.clickEvent, function(e) { $('#debug').toggleClass('open'); });
		}
	}

	/**
	 * <p><strong>Current Page</strong></p>
	 *
	 * <p>Returns the current page ID</p>
	 *
	 * @return {string} - Current page ID
	 */
	FW.currentPage = function()
	{
		return _page_id;
	}


/*==[ FW.PAGE ]==============================================================*/

	/**
	 * <p><strong>Page Object</strong></p>
	 *
	 * <p>Holds information about the current page and is used as a
	 * reference template for the page objects within the sitemap JSON</p>
	 * <p><em>For more information, see sample.sitemap.json</em></p>
	 *
	 * @class
	 * @memberOf FW
	 * @property {string} id
	 *   - ID used to reference the page (also used for tracking)
	 * @property title
	 *   - Title of the page (used in navigation and tracking)
	 * @property type
	 *   - Type of page/sitemap entry [page, hidden, header, button]
	 * @property [file]
	 *   - Path and filename of the source code for the page
	 * @property [children]
	 *   - An array of child page objects
	 * @property {object} onVisibleCallbacks
	 *   - Callbacks fired when page is loaded
	 * @property {object} onLoadCallbacks
	 *   - Callbacks fired when page is visible
	 */
	FW.PAGE = {
		"id"                 : '',
		"type"               : '',
		"file"               : '',
		"title"              : '',
		"children"           : [],
		"onLoadCallbacks"    : {},
		"onVisibleCallbacks" : {}
	};

	/**
	 * <p><strong>Next Page</strong></p>
	 *
	 * <p>Loads the next page in the path if not currently locked and
	 * additional pages are available and adjusts the current position</p>
	 */
	FW.PAGE.next = function()
	{
		if(!_locked && _path_pos < _path.length-1)
		{
			FW.PAGE.load(_path[++_path_pos], 'R2L');
		}
	}

	/**
	 * <p><strong>Previous Page</strong></p>
	 *
	 * <p>Loads the previous page in the path if not currently locked and
	 * earlier pages are available and adjusts the current position</p>
	 */
	FW.PAGE.prev = function()
	{
		if(!_locked && _path_pos > 0)
		{
			FW.PAGE.load(_path[--_path_pos], 'L2R');
		}
	}

	/**
	 * <p><strong>Lock Page Navigation</strong></p>
	 *
	 * <p>Locks the swiping, and optionally, the navigation menus</p>
	 */
	FW.PAGE.lock = function()
	{
		_locked = true;
		$('#'+FW.PAGE.formatId(FW.PAGE.id)).addClass('locked');
	}

	/**
	 * <p><strong>Unlock Page Navigation</strong></p>
	 *
	 * <p>Unlocks the swiping, and optionally, the navigation menus</p>
	 */
	FW.PAGE.unlock = function()
	{
		_locked = false;
		$('#'+FW.PAGE.formatId(FW.PAGE.id)).removeClass('locked');
	}

	/**
	 * <p><strong>Format Page ID</strong></p>
	 *
	 * <p>Takes a given page ID and replaces periods with dashes</p>
	 *
	 * @param {string} id
	 *   - ID of the page to format
	 *
	 * @return {string}
	 *   - Formatted page ID
	 */
	FW.PAGE.formatId = function(id)
	{
		return id.replace(/\./g,'-');
	}

	/**
	 * <p><strong>Get Page Information</strong></p>
	 *
	 * <p>Takes a given page ID and returns the page object</p>
	 *
	 * @param {string} page
	 *   - ID of page to retrieve
	 *
	 * @return {object|boolean}
	 *   - Returns page object, or false if page does not exist
	 */
	FW.PAGE.get = function(page)
	{
		page = FW.PAGE.formatId(page);

		return (FW.SITEMAP.index[page]) ? FW.SITEMAP.index[page] : false;
	}

	/**
	 * <p><strong>Load a New Page</strong></p>
	 *
	 * <p>Takes a given page ID and references the sitemap for page
	 * information, then loads the page via AJAX off screen (based
	 * on transition param) and triggers an animation by removing
	 * the "loading" class.</p>
	 * <p>After load, a callback is triggered if one exists for the
	 * requested page.</p>
	 *
	 * @param {string} page
	 *   - ID of page to load
	 * @param {string} [transition="NONE"]
	 *   - Which direction to load new page, options are:
	 *     FADE, L2R, R2L, T2B, B2T, NONE
	 */
	FW.PAGE.load = function(page, transition)
	{
		/* DEBUG */ FW.LOG("Starting Page Load for page [" + page + "]");

		// Optional Parameter Defaults
		transition = transition || 'NONE';

		if(!FW.SITEMAP.loaded)
		{
			/* DEBUG */ FW.LOG("Page load error: No Sitemap");
			return false;
		}
		if(_page_id == page)
		{
			/* DEBUG */ FW.LOG("Page load error: Already on Requested Page");
			FW.LIGHTBOX.hide();
			return false;
		}
		if(_locked && FW.SETTINGS.locknav)
		{
			/* DEBUG */ FW.LOG("Page load error: Page is Locked");
			return false;
		}

		_page_id = page;

		/* DEBUG */ FW.LOG("Preparing screen " + (1 - _display.current) + " for off-screen rendering");
		_display.screens[1 - _display.current].className = 'SCREEN ' + transition + ' loading';

		var new_page = FW.PAGE.get(page);

		if(!new_page)
		{
			/* DEBUG */ FW.LOG("Page load error: Could not retrieve page information for " + page);
			return false;
		}

		FW.PAGE.id       = new_page.id       || '';
		FW.PAGE.type     = new_page.type     || '';
		FW.PAGE.file     = new_page.file     || '';
		FW.PAGE.title    = new_page.title    || '';
		FW.PAGE.children = new_page.children || [];
		FW.PAGE.parent   = new_page.parent   || false;

		/* DEBUG */ FW.LOG("Starting Asynchronous Request for Page...");
		$.ajax({ type: 'GET', url: FW.PAGE.file, dataType: 'html', timeout: 300,
			error: function(xhr, type, e)
			{
				/* DEBUG */ FW.LOG("Page load error: Ajax Request Timed Out");

				// Try again on Ajax error, but reset the page ID
				_page_id = null;
				FW.PAGE.load(page, transition);
			},
			success: function(data)
			{
				if(!data || data.length < 1)
				{
					/* DEBUG */ FW.LOG("Page load error: Response is Empty");
					return false;
				}
				else
				{
					/* DEBUG */ FW.LOG("Page loaded");
				}

				// Hide Open UI Elements
				FW.NAV.hide();
				FW.LIGHTBOX.hide();
				FW.PAGE.unlock();

				$('#navigation li').removeClass('active').removeClass('open');
				$('#nav-' + FW.PAGE.formatId(FW.PAGE.id)).addClass('active');
				$('#nav-' + FW.PAGE.formatId(FW.PAGE.id)).parents('li').addClass('open');
				if(FW.PAGE.children.length > 0)
				{
					$('#nav-' + FW.PAGE.formatId(FW.PAGE.id)).addClass('open');
				}

				parent = FW.PAGE.parent;

				while(parent)
				{
					/* DEBUG */ FW.LOG("Looping through page parents...");
					$('#nav-' + FW.PAGE.formatId(parent.id)).addClass('open');
					var tmp = FW.PAGE.get(parent.id);
					if(!tmp) { parent = false; }
					else     { parent = tmp.parent || false; }
				}

				$('#buttonbar li').removeClass('active');

				_display.current = 1 - _display.current;

				/* DEBUG */ FW.LOG("Populating screen " + (_display.current) + " with content");
				_display.screens[_display.current].innerHTML = data;

				/* DEBUG */ FW.LOG("Killing scrolling on screen " + (_display.current));
				$(_display.screens[_display.current]).find('.scrollable').on('touchmove', function(e) { e.stopPropagation(); });

				/* DEBUG */ FW.LOG("Deactivating screen " + (1 - _display.current));
				$(_display.screens[1 - _display.current]).removeClass('active');

				/* DEBUG */ FW.LOG("Activating screen " + (_display.current));
				$(_display.screens[_display.current]).removeClass('hidden').addClass('active');
				setTimeout(function()
				{
					/* DEBUG */ FW.LOG("Animating screen " + (_display.current) + " into view...");
					$(_display.screens[_display.current]).removeClass('loading')
				} , 10);
				setTimeout(function()
				{
					/* DEBUG */ FW.LOG("Hiding screen " + (1 - _display.current) + "...");
					$(_display.screens[1 - _display.current]).addClass('hidden')
				} , 500);

				// Page Load Callback
				if(typeof(FW.PAGE.onLoadCallbacks[FW.PAGE.id]) == 'function')
				{
					FW.PAGE.onLoadCallbacks[FW.PAGE.id]();
				}

				// Page Visible Callback
				if(typeof(FW.PAGE.onVisibleCallbacks[FW.PAGE.id]) == 'function')
				{
					$(_display.screens[1 - _display.current]).addClass('hidden');
					setTimeout(FW.PAGE.onVisibleCallbacks[FW.PAGE.id], 500);
				}

				// Double check path position
				// (in case this wasn't called from next or prev)
				if(_path[_path_pos] != _page_id)
				{
					for(var i=0; i <= _path.length; i++)
					{
						if(i == _path.length)
						{
							FW.SITEMAP.setPath(FW.SETTINGS.swipepath);
							break;
						}
						if(_path[i] == _page_id)
						{
							_path_pos = i;
							break;
						}
					}
				}

				FW.TRACKING.track('pageview', FW.PAGE.title, FW.PAGE.id);
			}
		});
	}

	/**
	 * <p><strong>Set Page Load Callback</strong></p>
	 *
	 * <p>Adds a callback function to be called when a
	 * specific page is loaded</p>
	 *
	 * @param {string}   id
	 *   - Page ID to assign callback
	 * @param {function} func
	 *   - Name of callback function
	 */
	FW.PAGE.onLoad = function(id, func)
	{
		if(typeof(func) == 'function')
		{
			FW.PAGE.onLoadCallbacks[id] = func;
		}
	}

	/**
	 * <p><strong>Set Page Visible Callback</strong></p>
	 *
	 * <p>Adds a callback function to be called when a
	 * specific page is visible</p>
	 *
	 * @param {string}   id
	 *   - Page ID to assign callback
	 * @param {function} func
	 *   - Name of callback function
	 */
	FW.PAGE.onVisible = function(id, func)
	{
		if(typeof(func) == 'function')
		{
			FW.PAGE.onVisibleCallbacks[id] = func;
		}
	}


/*==[ FW.SITEMAP ]===========================================================*/

	/**
	 * <p><strong>Sitemap Object</strong></p>
	 *
	 * <p>Note: By default this object is empty and is populated on load from
	 * the sitemap JSON file (js/sitemap.json), only the loaded property is
	 * included by default.</p>
	 * <p><em>For more information, see sample.sitemap.json</em></p>
	 *
	 * @class
	 * @memberOf FW
	 * @property {boolean} [loaded=false]
	 *   - <em>Changed</em> to true when the sitemap JSON is loaded
	 * @property {array} pages
	 *   - Array of page objects
	 * @property {array} buttonbar
	 *   - Array of buttons for button bar
	 * @property {object} paths
	 *   - Collection of segmentation path arrays (at least one required)
	 * @property {object} index
	 *   - <em>Auto-Generated</em> reverse lookup of sitemap entries by ID
	 * @property {object} callbacks
	 *   -
	 */
	FW.SITEMAP = {
		"loaded" : false
	};

	/**
	 * <p><strong>Set Segmentation Path</strong></p>
	 *
	 * <p>Sets the current segmentation path and adjusts the current
	 * path position to the proper slide, or a default location in the
	 * path (usually the start)</p>
	 *
	 * @param {string} path
	 *   - Name of segmentation path
	 */
	FW.SITEMAP.setPath = function(path)
	{
		if(typeof(FW.SITEMAP.paths[path]) == 'object')
		{
			_path = FW.SITEMAP.paths[path];
		}
		else
		{
			_path = FW.SITEMAP.paths[FW.SETTINGS.swipepath];
		}

		for(var i=0; i < _path.length; i++)
		{
			if(_path[i] == _page_id)
			{
				_path_pos = i;
				return;
			}
		}

		_path_pos = 0;
	}

	/**
	 * <p><strong>Sitemap Indexer</strong></p>
	 *
	 * <p>Recursive function to build an index of pages for faster access.</p>
	 *
	 * @param {array} pages
	 *   - Array of page objects
	 * @param {object} [parent]
	 *   - Parent Node
	 */
	FW.SITEMAP.createIndex = function(pages, parent)
	{
		// Initialize Index
		if(typeof(FW.SITEMAP.index) != "object")
		{
			FW.SITEMAP.index = {};
		}

		for(var page=0; page < pages.length; page++)
		{
			// Load Index for Page
			if(typeof(FW.SITEMAP.index[pages[page].id]) != "object")
			{
				FW.SITEMAP.index[FW.PAGE.formatId(pages[page].id)] = pages[page];
			}

			// Load Parent for Page
			if(typeof(parent) == "object")
			{
				FW.SITEMAP.index[FW.PAGE.formatId(pages[page].id)].parent = parent;
			}

			// Recursive Step
			if(typeof(pages[page].children) == 'object')
			{
				FW.SITEMAP.createIndex(pages[page].children, pages[page]);
			}
		}
	}


/*==[ FW.NAV ]===============================================================*/

	/**
	 * <p><strong>Navigation Object</strong></p>
	 *
	 * <p>Note: By default this object is empty and is populated on load from
	 * the sitemap JSON file (js/sitemap.json), only the loaded property is
	 * included by default.</p>
	 * <p><em>For more information, see sample.sitemap.json</em></p>
	 *
	 * @class
	 * @memberOf FW
	 * @property {string} active
	 *   - Currently active page id
	 */
	FW.NAV = {
		"active" : FW.SETTINGS.primary
	};

	/**
	 * <p><strong>Navigation Visibility Toggle</strong></p>
	 *
	 * <p>Toggles the open/close state of the navigation based on
	 * whether the navigation element has a class of "open"</p>
	 *
	 * @memberOf FW.NAV
	 */
	FW.NAV.toggle = function()
	{
		if($('#navigation').hasClass('open')) { FW.NAV.hide(); }
		else                                  { FW.NAV.show(); }
	}

	/**
	 * <p><strong>Navigation Menu Item Toggle</strong></p>
	 *
	 * <p>Toggles the open/close state of accordian menu items</p>
	 *
	 * @memberOf FW.NAV
	 */
	FW.NAV.itemToggle = function(item)
	{
		if($('#' + item).hasClass('open'))
		{
			$('#' + item).removeClass('open');
		}
		else
		{
			$('#navigation .open').removeClass('open');
			$('#' + item).addClass('open');
		}
	}

	/**
	 * <p><strong>Open the Navigation Menu</strong></p>
	 *
	 * <p>Adds the class "open" to the navigation menu and the
	 * class "active" to the navigation button</p>
	 *
	 * @memberOf FW.NAV
	 */
	FW.NAV.show = function()
	{
		if(FW.SETTINGS.locknav && _locked) { return false; }

		$('#navigation').addClass('open');
		$('#navbutton').addClass('active');
	}

	/**
	 * <p><strong>Close the Navigation Menu</strong></p>
	 *
	 * <p>Removes the class "open" from the navigation menu and the
	 * class "active" from the navigation button</p>
	 *
	 * @memberOf FW.NAV
	 */
	FW.NAV.hide = function()
	{
		$('#navigation').removeClass('open');
		$('#navbutton').removeClass('active');
	}

	/**
	 * <p><strong>Menu Builder</strong></p>
	 *
	 * <p>Recursive function to build the page menu hierarchies
	 * based on supplied array of pages. Used for Navigation and ToC</p>
	 *
	 * @param {array} pages
	 *   - Array of page objects
	 * @param {int}   level
	 *   - Current build level of hierarchal menu
	 * @param {string} [prefix="nav-"]
	 *   - Prefix for all IDs generated (should be unique)
	 * @param {boolean} [accordian=false]
	 *   - Include accordian functionality
	 * @param {boolean} [hidden=false]
	 *   - Include sitemap entries with a type of "hidden"
	 * @param {boolean} [buttons=false]
	 *   - Include sitemap entries with a type of "button"
	 *
	 * @return {string}
	 *   - HTML markup of navigation menu
	 */
	FW.NAV.generate = function(pages, level, prefix, accordian, hidden, buttons)
	{
		// Optional Parameter Defaults
		prefix    = prefix    || 'nav-';
		accordian = accordian || false;
		hidden    = hidden    || false;
		buttons   = buttons   || false;

		var html = '<ul>';

		for(var page=0; page < pages.length; page++)
		{
			if(!hidden  && pages[page].type == 'hidden') { continue; }
			if(!buttons && pages[page].type == 'button') { continue; }

			html += '<li id="' + prefix + FW.PAGE.formatId(pages[page].id) + '" class="' + pages[page].type + '">';

			switch(pages[page].type)
			{
				case "header":
					var func = "";
					if(accordian)
					{
						func = "FW.NAV.itemToggle('" + prefix + FW.PAGE.formatId(pages[page].id) + "')";
					}
					else if(typeof(pages[page].children) == 'object' && pages[page].children.length > 0)
					{
						func = "FW.PAGE.load('" + pages[page].children[0].id + "', '" + FW.SETTINGS.transition + "');";
					}
					html += '<a href="javascript:' + func + '">' + pages[page].title + '</a>';
					break;

				case "slide":
					html += '<a href="javascript:FW.PAGE.load(\'' + pages[page].id + '\', \'' + FW.SETTINGS.transition + '\')">';
					html += pages[page].title;
					html += '</a>';
					break;

				case "button":
					html += '<a href="' + pages[page].file + '">';
					html += pages[page].title;
					html += '</a>';
					break;
			}

			// Recursive Step
			if(typeof(pages[page].children) == 'object')
			{
				html += FW.NAV.generate(pages[page].children, level+1, prefix, accordian, hidden, buttons);
			}

			html += '</li>';
		}

		html += '</ul>';

		return html;
	}

	/**
	 * <p><strong>Buttonbar Builder</strong></p>
	 *
	 * <p>Builds the bottom button bar navigation
	 * based on supplied array within the sitemap.</p>
	 *
	 * @param {array} button
	 *   - Array of buttons from the sitemap
	 * @param {string} [prefix="bbar-"]
	 *   - Prefix for all IDs generated (should be unique)
	 *
	 * @return {string}
	 *   - HTML markup of button bar
	 */
	FW.NAV.buttonBar = function(buttons, prefix)
	{
		// Optional Parameter Defaults
		prefix = prefix || 'bbar-';

		var html = '<ul>';

		for(var btn=0; btn < buttons.length; btn++)
		{
			if(buttons[btn].type == 'button')
			{
				html += '<li id="' + prefix + FW.PAGE.formatId(buttons[btn].id) + '" class="' + buttons[btn].type + '">';
				html += '<a href="' + buttons[btn].file + '">' + buttons[btn].title + '</a>';
				html += '</li>';
			}
		}

		html += '</ul>';

		return html;
	}


/*==[ FW.TABS ]==============================================================*/

	/**
	 * <p><strong>Tab UI Object</strong></p>
	 *
	 * <p>Encapsulates methods for working with tabbed content areas</p>
	 *
	 * @class
	 * @memberOf FW
	 */
	FW.TABS = {};

	/**
	 * <p><strong>Show a Selected Tab</strong></p>
	 *
	 * <p>Show a specific tab on the active page and hide all others</p>
	 *
	 * @param {string} tab
	 *   - DOM classname of tab to show
	 */
	FW.TABS.show = function(tab)
	{
		if(!_locked)
		{
			var page_id = FW.PAGE.formatId(_page_id);
			var matches = $('#' + page_id)[0].className.match( /(show-tab-[0-9]+)/ );

			for(var i=0; matches != null && i < matches.length; i++)
			{
				$('#' + page_id).removeClass(matches[i]);
			}
			$('.tab').removeClass('active');
			$('#' + FW.PAGE.formatId(_page_id)).addClass('show-' + tab);
			$('#' + FW.PAGE.formatId(_page_id) + ' .' + tab).addClass('active');
		}
	}


/*==[ FW.LIGHTBOX ]==========================================================*/

	/**
	 * <p><strong>Lightbox Object</strong></p>
	 *
	 * <p>Encapsulates methods for loading content, showing, and hiding the
	 * lightbox.</p>
	 *
	 * @class
	 * @memberOf FW
	 * @property {object} container
	 *   - Lightbox DOM element
	 * @property {object} content
	 *   - Lightbox content DOM element
	 */
	FW.LIGHTBOX = {
		"container" : document.getElementById('lightbox'),
		"content"   : document.getElementById('lb_content')
	};


	/**
	 * <p><strong>Show Popup</strong></p>
	 *
	 * <p>Adds an 'active' class to the lightbox and loads content
	 * (content can be passed directly, referenced by ID, or called
	 * via AJAX request)</p>
	 *
	 * @param {string} content
	 *   - Popup content, Element ID, or filename
	 * @param {string} [source="passed"]
	 *   - Source of the content, options are:<br>
	 *     "passed" = value of content parameter is shown<br>
	 *     "inline" = inner HTML of element with matching ID is shown<br>
	 *     "ajax"   = contents of file are shown<br>
	 *     "image"  = image file is shown
	 * @param {string} [addclass]
	 *   - Optionally assign a class to the lightbox DOM element
	 */
	FW.LIGHTBOX.show = function(content, source, addclass)
	{
		// Optional Parameter Defaults
		source   = source   || 'passed';
		addclass = addclass || '';

		FW.NAV.hide();

		switch(source)
		{
			case "ajax":
				$.get(content, function(data)
				{
					FW.LIGHTBOX.content.innerHTML = data;
					FW.LIGHTBOX.container.className = addclass + ' active';
					$(FW.LIGHTBOX.content).find('.scrollable').on('touchmove', function(e) { e.stopPropagation(); });
				});
				return;

			case "image":
				FW.LIGHTBOX.content.innerHTML = '<img src="' + content + '" alt="">';
				FW.LIGHTBOX.container.className = addclass + ' active';
				return;

			case "inline":
				if($('#' + content).length > 0)
				{
					FW.LIGHTBOX.content.innerHTML = $('#' + content).html();
					FW.LIGHTBOX.container.className = addclass + ' active';
				}
				return;

			case "passed": default:
				FW.LIGHTBOX.content.innerHTML = content;
				FW.LIGHTBOX.container.className = addclass + ' active';
				return;
		}
	}

	/**
	 * <p><strong>Hide Popup</strong></p>
	 *
	 * <p>Hides active popups and overlay</p>
	 *
	 * @param {object} [e] Event (such as a click event) to stop bubbling
	 */
	FW.LIGHTBOX.hide = function(e)
	{
		FW.LIGHTBOX.container.className = '';
		FW.LIGHTBOX.content.innerHTML = '';
	}


/*==[ FW.TRACKING ]==========================================================*/

	/**
	 * <p><strong>Tracking Object</strong></p>
	 *
	 * <p>The tracking class provides a simple interface to the clickstream
	 * tracking object within irep</p>
	 *
	 * @class
	 * @memberOf FW
	 * @property {array} callbacks
	 *   - Array of callbacks for tracking results
	 * @property {object} iframe
	 *   - DOM iFrame used for making tracking requests
	 */
	FW.TRACKING = {
		"callbacks" : [],
		"iframe"    : false
	};

	/**
	 * <p><strong>Submit a tracking request</strong></p>
	 *
	 * <p>Make a tracking request with the given information</p>
	 *
	 * @param {string} track_type
	 *   - Type of tracking request (e.g. page_view, video, etc.)
	 * @param {string} track_value
	 *   - Value of the tracking request (e.g. page name, video name, etc.)
	 * @param {string} track_id
	 *   - ID of the tracking request (e.g. Page ID)
	 */
	FW.TRACKING.track = function (track_type, track_value, track_id)
	{
		var clickStream = {
			'Track_Element_Description_vod__c' : track_value,
			'Track_Element_Id_vod__c'          : track_id,
			'Track_Element_Type_vod__c'        : track_type
		};

		var request  = "veeva:saveObject(";
		    request += "Call_Clickstream_vod__c),";
		    request += "value(" + JSON.stringify(clickStream) + "),";
		    request += "callback(FW.TRACKING.result)";

		if(typeof(FW.TRACKING.iframe) != "object")
		{
			// The iframe is necessary to not break the active page.
			FW.TRACKING.iframe = document.createElement("iframe");
			FW.TRACKING.iframe.setAttribute("style", 'visibility:hidden;position:absolute;top:0px;left:0px;width:1px;height:1px;');
			FW.TRACKING.iframe.setAttribute("id", "FW_TRACKING_IFRAME");
			document.body.appendChild(FW.TRACKING.iframe);
		}

		FW.TRACKING.iframe.src = request;
	}

	/**
	 * <p><strong>Add a tracking callback</strong></p>
	 *
	 * <p>Add a callback to retrieve tracking call results</p>
	 *
	 * @param {function} callback
	 *   - Name of callback function to call
	 */
	FW.TRACKING.addCallback = function(callback)
	{
		if(typeof(callback) == "function")
		{
			FW.TRACKING.callbacks.push(callback);
		}
	}

	/**
	 * <p><strong>Handle tracking results</strong></p>
	 *
	 * <p>Call all registered tracking callbacks and pass tracking results</p>
	 * <p>The result is a json object passed in by iRep media player this
	 * can be used to display success/error messages for debugging purposes</p>
	 *
	 * @param {object} result
	 *   - JSON object returned by iRep
	 */
	FW.TRACKING.result = function(result)
	{
		for(var i=0; i < FW.TRACKING.callbacks.length; i++)
		{
			// result is a json object passed in by iRep media player
			// this can be used to display success/error messages for
			// debugging purposes
			FW.TRACKING.callbacks[i](result);
		}
	}

	/**
	 * <p><strong>Log Messages to the Debug Console</strong></p>
	 *
	 * <p>Prints debug messages to the debug console if debugging is enabled</p>
	 * <p>See: FW.SETTINGS.debug</p>
	 *
	 * @param {string} msg
	 *   - Message to send to debug console
	 */
	FW.LOG = function(msg)
	{
		if(FW.SETTINGS.debug)
		{
			$('#console').append(msg + '<br>');
			$("#console")[0].scrollTop = $("#console")[0].scrollHeight;
		}
	}


	/**
	 * Call init on DOM load
	 */
	$(function() { FW.INIT(); });

}(FW = window.FW || {}, Zepto));
