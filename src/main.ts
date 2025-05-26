/**
 * ----- imgview obsidian plugin -----
 * 
 * 1. Add tag to each image
 * 	- #F01-1 Add tag 
 * 		- [x] #F01-1-1 Add in file menu 
 * 		- [x] #F01-1-2 Add by tag button in view 
 * 	- [x] #F01-2 Edit tag model
 * 	
 * 2. Build image view 
 * 	- [x] #F02-01 Build Config > getConfig
 *  - [x] #F02-02 Render View > renderView
 * 	- [x] #F02-1 GALLERY mode 
 * 		- [x] #F02-1-1 FROM file_name
 * 		- [x] #F02-1-2 Where tag IN ('tag_name')
 * 		- [x] #F02-1-3 Where tag_group IN ('tag_gp_name')
 * 		- [x] #F02-1-4 Where tag_group IN ('tag_gp_name') AND !tag -> can only use with tag_group
 * 		- [x] #F02-1-5 LIMIT no
 * 
 * 3. Set tag group
 * 	- [x] #F03-01 Tag group Setting
 * 	- [x] #F03-1 Add tag group
 * 	- [x] #F03-2 Edit tag group
 * 
 */


import { AsyncLocalStorage } from 'node:async_hooks';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu, ItemView, WorkspaceLeaf, MenuItem, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

var TAG_DATA: any = {}
var TAG_GROUP: any = {}
let SUPPORT_MODE = ['GALLERY']

interface ImgViewSettings {
}

const DEFAULT_SETTINGS: ImgViewSettings = {
}

export default class ImgView extends Plugin {
	settings: ImgViewSettings;

	async onload() {
		await this.loadSettings();

		const check_config_exist = await this.checkExist();
		if (check_config_exist == false) {
			this.app.vault.adapter.write(this.app.vault.configDir + '/imgview.json', JSON.stringify({ 'tag': TAG_DATA, 'tag_gp': TAG_GROUP }))
		}

		try {
			const tag_data = await this.readConfig();
			//var tag_data_input = {}

			try {
				//tag_data_input = JSON.parse(tag_data)
				var TAG_DATA_CONFIG = JSON.parse(tag_data)
			} catch (error) {

			}

			if (TAG_DATA_CONFIG.hasOwnProperty('tag')) {
				TAG_DATA = TAG_DATA_CONFIG['tag']
			}

			if (TAG_DATA_CONFIG.hasOwnProperty('tag_gp')) {
				TAG_GROUP = TAG_DATA_CONFIG['tag_gp']
			}
		} catch (error) {

		}

		this.app.vault.adapter.write(this.app.vault.configDir + '/imgview.json', JSON.stringify({ 'tag': TAG_DATA, 'tag_gp': TAG_GROUP }))

		// Manage Tag Groups
		this.addSettingTab(new ImgViewSettingTab(this.app, this));

		// Manage Tags
		this.registerEvent(
			// #F01-1-1 Add in file menu 
			this.app.workspace.on('file-menu', (menu, file: TFile) => {
				menu.addItem((item) => {
					item
						.setTitle('Add Tag')
						.setIcon('tag')
						.onClick(() => {
							const file_obj = this.app.workspace.getActiveFile();
							if (file_obj != null) {
								new AddTagModel(this.app, TAG_DATA, file_obj.path, async (file_path, tags) => {
									const new_config = getUpdateConfigTag(file_path, tags, TAG_DATA)
									const new_config_update = await this.writeConfig({ 'tag': new_config, 'tag_gp': TAG_GROUP });

									TAG_DATA = new_config

									new Notice('Tag updated.')
								}).open();
							}

						})
				})
			})
		)

		// Render Trigger for ```imgview ```
		this.registerMarkdownCodeBlockProcessor('imgview', (source, el) => {
			el.appendChild(renderView(source, this));
		})


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Manage imgview.json
	async checkExist(): Promise<boolean> {
		const { vault } = this.app;
		return vault.adapter.exists(vault.configDir + '/imgview.json')
	}

	async writeConfig(data: any): Promise<string> {
		try {
			const { vault } = this.app;
			await vault.adapter.write(this.app.vault.configDir + '/imgview.json', JSON.stringify(data))
			return JSON.stringify(data)
		} catch (error) {
			return error.toString()
		}
	}

	async readConfig(): Promise<string> {
		const { vault } = this.app;

		return vault.adapter.read(this.app.vault.configDir + '/imgview.json')
	}

}

/* SECTION generate update/delete config */

function getUpdateConfigTag(file_path: string, tag_list_str: string, tag_data: any) {
	var tag_list: string[] = []
	if (tag_list_str != '') {
		tag_list = [tag_list_str]
		if (tag_list_str.includes(',')) {
			tag_list = tag_list_str.split(',')
		}
	}

	var temp_tag_data = JSON.parse(JSON.stringify(tag_data))

	tag_list.forEach(each_tag => {
		if (!temp_tag_data.hasOwnProperty(each_tag)) {
			temp_tag_data[each_tag] = [file_path]
		}
	})

	Object.keys(temp_tag_data).forEach(each_tag => {
		temp_tag_data[each_tag] = temp_tag_data[each_tag].filter((elm: string) => elm != file_path)

		if (tag_list.includes(each_tag)) {
			temp_tag_data[each_tag].push(file_path)
		}
	})

	return temp_tag_data
}

function getUpdateConfigTagGroup(tag_group: string, tag_list_str: any, tag_gp_data: any ) {

	var temp_tag_gp_data = JSON.parse(JSON.stringify(tag_gp_data))

	var tag_list: string[] = []
	if (tag_list_str != '') {
		tag_list = [tag_list_str]
		if (tag_list_str.includes(',')) {
			tag_list = tag_list_str.split(',')
		}
	}

	temp_tag_gp_data[tag_group] = tag_list

	return temp_tag_gp_data
}

function getRemoveConfigTag(tag: string, tag_data: any ) {

	var temp_tag_gp_data = JSON.parse(JSON.stringify(tag_data))

	delete temp_tag_gp_data[tag]

	return temp_tag_gp_data
}


function getRemoveConfigTagGroup(tag_group: string, tag_gp_data: any ) {

	var temp_tag_gp_data = JSON.parse(JSON.stringify(tag_gp_data))

	delete temp_tag_gp_data[tag_group]

	return temp_tag_gp_data
}

/* !SECTION */

// #F02-01 Build Config > getConfig
function getConfig(source: any) {
	
	var mode = source.replaceAll('\n',' ')

	if (mode.includes(' ')) {
		mode = mode.split(' ')[0]
	}

	switch (mode) {
		case 'GALLERY':
			// #F02-1-5 LIMIT no
			const limitMatch = source.match(/LIMIT\s+(\d+)/i);

			// #F02-1-1 FROM file_name
			const fromMatch = source.match(/FROM\s+("[\w]+"|[\w]+)/i);

			// #F02-1-2 Where tag IN ('tag_name')
			const tagsMatch = source.match(/WHERE\s+(.*?)(tag\??)\s+IN\s*\(([^)]+)\)/i);

			// #F02-1-3 Where tag_group IN ('tag_gp_name')
			const tagsGpMatch = source.match(/WHERE\s+(.*?)(tag_group\??)\s+IN\s*\(([^)]+)\)/i);

			// #F02-1-4 Where !tag
			const tagsNotExist = source.match(/WHERE\s+(.*?)(!tag)/i);

			const limit = limitMatch ? limitMatch[1] : '-1';
			const from = fromMatch ? fromMatch[1].replaceAll('"', '') : '';
			const tags = tagsMatch ? tagsMatch[3].split(',').map((tag: string) => tag.trim().replace(/'/g, '').replace(/"/g, '')) : [];
			const taggps = tagsGpMatch ? tagsGpMatch[3].split(',').map((tag: string) => tag.trim().replace(/'/g, '').replace(/"/g, '')) : [];
			const tagsnotexist = tagsNotExist ? true : false;

			return { 'mode': 'gallery', 'limit': limit, 'from': from, 'tags': tags, 'tag_gp': taggps, '!tag': tagsnotexist };
			break
		default:
			console.log('not support.')
			return { 'mode': 0 }
	}

}

// #F02-02 Render View > renderView
function renderView(source: string, plugin: ImgView) {

	const image_container = createEl('div', { cls: 'grid grid-cols-4' })
	const imgview_config = getConfig(source)
	// new Notice(JSON.stringify(imgview_config))


	const { settings } = plugin;

	// const img_obj = image_container.createEl('div', {text: JSON.stringify(tag_data)})

	var data_list: any = []


	try {

		if (imgview_config['mode'] == 'gallery') {

			const files = this.app.vault.getFiles()
			// const img_obj = image_container.createEl('div', {text: imgview_config['tags'].length.toString()})

			var _tag_list: any = imgview_config['tags']
			

			/* SECTION get tag list */

			// if has tag_gp, filter tag_list with group: only show tags within group
			if (imgview_config['tag_gp'].length > 0) {

				var temp_tag_list: any = []
				imgview_config['tag_gp'].forEach((each_group: string) => {
					if (Object.keys(TAG_GROUP).includes(each_group)) {
						temp_tag_list = [...temp_tag_list, ...TAG_GROUP[each_group]]
					}
				});
				_tag_list = temp_tag_list

			}

			/* !SECTION */
			/* SECTION get image list */

			// if no tag and group -> show all
			if (_tag_list.length == 0 && imgview_config['tag_gp'].length == 0) {
				for (let i = 0; i < files.length; i++) {
					if (['png', 'jpg'].includes(files[i].extension.toLowerCase())) {

						data_list.push({
							'file_path': files[i].path,
							'file_path_src': this.app.vault.adapter.getResourcePath(files[i].path)
						})
					}

				}
			}
			// if has group but !tag -> show all image without tag in the group
			else if (imgview_config['tag_gp'].length > 0 && imgview_config['!tag']) {

				var exclude_files: any = []
				_tag_list.forEach((each_tag: string) => {
					if (Object.keys(TAG_DATA).includes(each_tag)) {
						for (let i = 0; i < TAG_DATA[each_tag].length; i++) {
							exclude_files.push(TAG_DATA[each_tag][i])
						}
					}
				})

				for (let i = 0; i < files.length; i++) {
					if (['png', 'jpg'].includes(files[i].extension.toLowerCase())) {
						if (!exclude_files.includes(files[i].path)) {
							data_list.push({
								'file_path': files[i].path,
								'file_path_src': this.app.vault.adapter.getResourcePath(files[i].path)
							})
						}
					}

				}
			}
			// if has tag (has/no) tag group -> show filter image
			else {

				_tag_list.forEach((each_tag: string) => {
					if (Object.keys(TAG_DATA).includes(each_tag)) {
						for (let i = 0; i < TAG_DATA[each_tag].length; i++) {
							var exist_json = data_list.filter((elm: { file_path: any; }) => elm.file_path == TAG_DATA[each_tag][i])
							if (exist_json.length > 0) {
								exist_json[0]['tags'].push(each_tag)
							} else {
								data_list.push({
									'file_path': TAG_DATA[each_tag][i],
									'file_path_src': this.app.vault.adapter.getResourcePath(TAG_DATA[each_tag][i]),
									'tags': [each_tag]
								})
							}
						}
					}
				});


			}

			// FROM file
			if (imgview_config['from'] != ''){
				data_list = data_list.filter((elm:any)=>elm.file_path.startsWith(imgview_config['from']))
			}

			/* !SECTION */

			/* SECTION render html */

			let max_n = data_list.length

			if(imgview_config['limit'] != '-1'){
				if (max_n > parseInt(imgview_config['limit'])){
					max_n = parseInt(imgview_config['limit'])
				}
			}

			//data_list.forEach((each_obj: any) => {
			
			for(let idx=0;idx<max_n;idx++){

				const each_obj = data_list[idx]

				const img_obj = image_container.createEl('div', { cls: 'img-container' });
				const _file_path = each_obj['file_path']
				const file_path_src = each_obj['file_path_src']

				// #F01-1-2 Add by tag button in view 
				const img_obj_tag_btn = img_obj.createEl('div', { cls: 'tag-btn', text: ' ' });
				img_obj_tag_btn.dataset.src = _file_path
				img_obj_tag_btn.onclick = async () => {
					new AddTagModel(this.app, TAG_DATA, _file_path, async (file_path, tags) => {
						const new_config = getUpdateConfigTag(file_path, tags, TAG_DATA)
						const new_config_update = await plugin.writeConfig({ 'tag': new_config, 'tag_gp': TAG_GROUP });
						TAG_DATA = new_config

						new Notice('Tag updated.')
					}).open();
				}

				const img_obj_img = img_obj.createEl('img', { attr: { src: file_path_src }, text: ' ' });
			}

			/* !SECTION */

		}


	} catch (error) {

		new Notice(error.toString())

	}

	// new Notice(image_container.innerHTML)

	return image_container
}


// #F01-2 Edit tag model
export class AddTagModel extends Modal {

	tag_data: any;
	file_path: string;
	constructor(app: App, tag_data: any, file_path: string, onSubmit: (file_path: string, tags: string) => void) {
		super(app);
		this.setTitle('Add tags');
		this.tag_data = tag_data;
		this.file_path = file_path;

		//const file_obj = this.app.workspace.getActiveFile();
		var init_val = ''
		var init_val_list: any = []

		if (file_path != null) {
			init_val_list = getTags(file_path, tag_data)
			init_val = init_val_list.join(',')
		}


		let tags = init_val;
		var tag_input_settings = new Setting(this.contentEl)
			.setName('Tags')
			.addText((text) =>
				text
					.setValue(init_val)
					.onChange((value) => {
						tags = value;

						var change_val: any = []

						if (value.includes(',')) {
							change_val = value.split(',')
						} else if (value != '') {
							change_val = [value]
						}
						updateTagClass(tag_select_container, change_val)

					})
			);

		const tag_select_container = this.contentEl.createEl('div', { cls: 'tag-container' })


		Object.keys(tag_data).forEach((each_tag: string) => {

			const tag_select_obj = tag_select_container.createEl('span', { text: `# ${each_tag}`, cls: 'tag tag-grey' })
			if (init_val_list.includes(each_tag)) {
				tag_select_obj.removeClass('tag-grey')
				tag_select_obj.addClass('tag-purple')
			}

			tag_select_obj.dataset.tag = each_tag

			tag_select_obj.onclick = (event) => {

				const target = event.currentTarget as HTMLElement;

				if (target != null) {
					var temp_val = tag_input_settings.controlEl.getElementsByTagName('input')[0].value.trim()

					var new_val: any = []

					if (temp_val.includes(',')) {
						new_val = temp_val.split(',')
					} else if (temp_val != '') {
						new_val = [temp_val]
					}

					if (target.hasClass('tag-purple')) {
						var remove_val = target.getAttribute('data-tag')
						new_val = new_val.filter((elm: string) => elm != remove_val)

					} else {
						var add_val = target.getAttribute('data-tag')
						new_val.push(add_val)
					}

					tags = new_val.join(',')
					tag_input_settings.controlEl.getElementsByTagName('input')[0].value = new_val.join(',')

					updateTagClass(tag_select_container, new_val)
				}


			};
		})

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Submit')
					.setCta()
					.onClick(() => {
						this.close();

						if (file_path != null && init_val != tags) {
							onSubmit(file_path, tags);
						}
					}));
	}
}

// AddTagModel - get tag list for init display
function getTags(file_path: string, tag_data: any) {
	var tag_list: string[] = []
	Object.keys(tag_data).forEach(each_tag => {
		if (tag_data[each_tag].includes(file_path)) {
			tag_list.push(each_tag)
		}
	})
	return tag_list
}

// AddTagModel - update css on change
function updateTagClass(tag_select_container: any, tag_value_list: any) {
	const tag_span_elms = [...tag_select_container.querySelectorAll('.tag')]
	tag_span_elms.forEach(each_elm => {
		if (tag_value_list.includes(each_elm.dataset.tag)) {
			each_elm.removeClass('tag-grey')
			each_elm.addClass('tag-purple')
		} else {
			each_elm.removeClass('tag-purple')
			each_elm.addClass('tag-grey')
		}
	});
}


// #F03-01 Tag group Setting
class ImgViewSettingTab extends PluginSettingTab {
	plugin: ImgView;

	constructor(app: App, plugin: ImgView) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const tag_header = containerEl.createEl('h4', { text: 'Tags' });

		const tag_select_container = containerEl.createEl('div', { cls: 'tag-container' })
		Object.keys(TAG_DATA).forEach(each_tag=>{
			if (TAG_DATA[each_tag].length > 0){
				const tag_select_obj = tag_select_container.createEl('span', { text: `# ${each_tag}`, cls: 'tag tag-purple' })
			}else{
				const tag_select_obj = tag_select_container.createEl('span', { text: `# ${each_tag} ⨯`, cls: 'tag tag-grey' })
				tag_select_obj.onclick = async () => {

					const new_config = getRemoveConfigTag(each_tag, TAG_DATA)
					const new_config_update = await this.plugin.writeConfig({ 'tag': new_config, 'tag_gp': TAG_GROUP });

					TAG_DATA = new_config

					tag_select_obj.remove()
				};
			}
		})

		const tag_gp_header = containerEl.createEl('h4', { text: 'Tag groups' });

		let tag_group = JSON.parse(JSON.stringify(TAG_GROUP));
		
		const tag_gp_container = containerEl.createEl('div', { cls: 'tag-gp-container' });

		// #F03-2 Edit tag group
		Object.keys(TAG_GROUP).forEach(each_tag_gp=>{
			const tag_gp_row = containerEl.createEl('div', { cls: 'tag-gp-row' });
			new Setting(tag_gp_row)
			 	.setName(each_tag_gp)
				.addText((text) =>
					text
					.setValue(tag_group[each_tag_gp].join(',')) 
					.onChange(async (tag_list_str) => {
						const new_config = getUpdateConfigTagGroup(each_tag_gp, tag_list_str ,TAG_GROUP )
						const new_config_update = await this.plugin.writeConfig({ 'tag': TAG_DATA, 'tag_gp': new_config });

						TAG_GROUP = new_config
					})
				)
				.addButton((btn) =>
					btn
					.setIcon('trash')
					.onClick(async (event) => {
						const new_config = getRemoveConfigTagGroup(each_tag_gp, TAG_GROUP)
						const new_config_update = await this.plugin.writeConfig({ 'tag': TAG_DATA, 'tag_gp': new_config });

						TAG_GROUP = new_config

						tag_gp_row.remove();
					})
				);
		})

		// #F03-1 Add tag group
		let new_gp = ''
		new Setting(containerEl)
			.addText((text) => 
				text
				.onChange((tag_group_name) => {
					new_gp = tag_group_name
				})
			)
			.addButton((btn) =>
				btn
				.setButtonText('Add tag group')
				.setClass("SettingPrimaryBtn")
				.onClick(async () => {
					const new_config = getUpdateConfigTagGroup(new_gp, '' ,TAG_GROUP )
					const new_config_update = await this.plugin.writeConfig({ 'tag': TAG_DATA, 'tag_gp': new_config });

					TAG_GROUP = new_config

					new Setting(tag_gp_container)
					.setName(new_gp)
					.addText((text) =>
						text
						.setValue('') 
						.onChange(async (tag_list_str) => {
							const new_config = getUpdateConfigTagGroup(new_gp, tag_list_str ,TAG_GROUP )
							const new_config_update = await this.plugin.writeConfig({ 'tag': TAG_DATA, 'tag_gp': new_config });

							TAG_GROUP = new_config
						})
					);
				})
			);

	}

	
}
