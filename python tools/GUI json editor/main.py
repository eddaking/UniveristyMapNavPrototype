#this is in python 3, try that first if things dont work
import os
import json
import ast
import re
import copy
import functools
import tkinter as TKI
import tkinter.messagebox as messagebox
import tkinter.simpledialog as tkSimpleDialog
from tkinter.filedialog import askopenfilename, asksaveasfilename
from scrframe import TwoDimScrolledFrame, VerticalScrolledFrame

#class for main display
class Home:
	#constructor
	def __init__(self, master, datamanager):
		
		self.datamanager = datamanager
		self.adddailog = None
		self.rowno = 0
		
		#create frame for holding first buttons
		self.frame1 = frame1 = TKI.Frame(master)
		frame1.pack()
		
		#create button for selecting a file
		TKI.Button(frame1, text="Select File", command=lambda: self.selectfile(master)).pack(side='left')
		
		#create button for quitting the application 
		TKI.Button(frame1, text="QUIT", fg="red", command=frame1.quit).pack(side='left')

		#create a frame for holding the other buttons
		self.frame2 = frame2 = TKI.Frame(master)

		TKI.Button(frame2, text="Add Data", command=self.__openadd).pack(side='left')
		
		TKI.Button(frame2, text="Save Data", command=self.__save).pack(side='left')

		self.sortoption = TKI.StringVar()
		self.sortoption.set(self.datamanager.getkeys()[0])
		TKI.OptionMenu(frame2, self.sortoption, *self.datamanager.getkeys()).pack(side='left')
		def sortbtnevent():
			self.datamanager.sort(self.sortoption.get())
		TKI.Button(frame2, text="Sort", command=sortbtnevent).pack(side='left')

		filterobj = FilterMethods(datamanager)
		filteroptions = filterobj.getmethodnames()
		filtermethods = filterobj.getmethods()

		filterframe = TKI.Frame(frame2)
		filterframe.pack(side='left')
		TKI.Label(filterframe, text="Filters").pack(side="left")

		filteroption = TKI.StringVar()
		filteroption.set(filteroptions[0])
		TKI.OptionMenu(filterframe, filteroption, *filteroptions).pack(side='left')

		def optionchanged(*args):
			filtermethods[filteroptions.index(filteroption.get())]()
		#'w' param calls callback on writes to variable
		filteroption.trace("w", optionchanged)
				
		#create button for quitting the application
		TKI.Button(frame2, text="QUIT", fg="red", command=frame2.quit).pack(side='left')
	#method handling click on selectfile - param specifying parent of display.
	def selectfile(self, master):
		#load file
		data = self.datamanager.loadfile()
		#if loading succeeded []=false, [1]=true
		if data:
			self.frame1.pack_forget()
			self.frame2.pack()

			tableframe = TKI.Frame(master)
			tableframe.pack(side='left', fill='both', expand=True)
			
			#TODO: fix scrolling for diff OSs
			#ref: https://stackoverflow.com/questions/17355902/python-tkinter-binding-mousewheel-to-scrollbar
			scrframe = TwoDimScrolledFrame(tableframe)
			scrframe.pack(fill='both', expand=True)
			
			dataframe = TKI.Frame(scrframe.interior, bg="#000000")
			
			#draw headers
			keys = self.datamanager.getheaders()
			self.addgridrow(dataframe, 0, keys)
			
			#draw table row by row
			for row_no, row in enumerate(data, 1):
				row.addgridrow(dataframe, row_no)
				self.rowno = row_no
			dataframe.pack()
			self.dataframe = dataframe
	def addgridrow(self, grid, row, data):
		for i, elem in enumerate(data):
			elemframe = TKI.Frame(grid)
			TKI.Label(elemframe, text=elem).pack(side="left")
			elemframe.grid(sticky="W"+"E", pady=1, padx=1, row=row, column=i)
	def __openadd(self):
		schema = self.datamanager.getschema()
		self.adddailog = DataInputBox(lambda: self.__add(), {}, schema, self.datamanager)
	def __save(self):
		self.datamanager.savefile()
	def __add(self):
		properties = self.adddailog.getinputs()
		if properties:
			newrow = self.datamanager.addrec(properties[1])
			self.rowno = self.rowno + 1
			newrow[1].addgridrow(self.dataframe, self.rowno + 1)
			self.adddailog.closewindow()
#class representing each row of data in the display
#contains both data and gui references
class DataRow:
	#constructor
	def __init__(self, datamanager, data, index):
		self.datamanager = datamanager
		self.data = data
		self.index = index
		self.row = 0
		self.parent = None
		self.editdialog = None
		self.labelsandframes = []
		self.hidden = False
	def __gettextfromdata(self, dictioanry, index=[]):
		data = []
		for key, val in dictioanry.items():
			if isinstance(val, dict):
				newindex = index.copy()
				newindex.append(key)
				data = data + self.__gettextfromdata(dictioanry[key], newindex)
			else:
				data.append([index + [key], val])
		return data
	#method for creating GUI elements
	def addgridrow(self, grid, row):
		self.row = row
		self.parent = grid
		hdrlen = len(self.datamanager.getheaders())
		for elem in self.__gettextfromdata(self.data):
			rowfunc = self.datamanager.getcolfromindex
			self.labelsandframes.append(self.__attachlabeltoframe(rowfunc(elem[0]), elem[1]))
		self.labelsandframes.append(self.__attachbuttontoframe(hdrlen-2, "Edit", lambda: self.__edit()))
		self.labelsandframes.append(self.__attachbuttontoframe(hdrlen-1, "Delete", lambda: self.__del()))
	#method to create a label and attach it to the parent in the correct grid ref
	def __attachlabeltoframe(self, col, text):
		elem_frame = TKI.Frame(self.parent)
		elem_frame.grid(sticky="W"+"E", pady=1, padx=1, row=self.row, column=col)
		lbl = TKI.Label(elem_frame, text=str(text))
		lbl.pack(side="left")
		return [elem_frame, lbl]
	#method to create a button and attach it to the parent in the correct grid ref
	def __attachbuttontoframe(self, col, text, lmda):
		elemframe = TKI.Frame(self.parent)
		elemframe.grid(sticky="W"+"E", padx=1, row=self.row, column=col)
		btn = TKI.Button(elemframe, text=text, command=lmda, bd=0, bg="#E1E1E1", relief="solid")
		btn.pack(side="left")
		return [elemframe, btn]
	#method for event of 'edit' button click
	def __edit(self):
		schema = self.datamanager.getschema()
		self.editdialog = DataInputBox(lambda: self.__update(), self.data, schema, self.datamanager)
	#method for updating data as a result of an edit
	def __update(self):
		#get the inputs from the dialog
		properties = self.editdialog.getinputs()
		#if no properties are returned 1+ input were invalid
		if properties:
			#properties[0] is a bool specifying if the data was changed, if so, update data
			if properties[0]:
				#update data localy
				self.data = properties[1]
				#set updated flag in datamanager
				self.datamanager.updaterec()
				#delete  old frames
				for frame in self.labelsandframes:
					frame[0].destroy()
				self.labelsandframes = []
				#draw a new grid row in the same place as the last one with the new data
				self.addgridrow(self.parent, self.row)
			self.editdialog.closewindow()	
	#method for event 'delete' button click
	def __del(self):
		for label in self.labelsandframes:
			label[0].destroy()
		self.datamanager.delrec(self.index)
		self.data = {}
	#change the row on which this data is drawn to the specified one
	def setrow(self, row):
		self.row = row
		if not self.hidden:
			for frame in self.labelsandframes:
				if isinstance(row, int):
					frame[0].grid(row=row)
				else:
					frame[0].grid_remove()
	#method which hides the row unless it is aready hidden
	def hiderow(self):
		if not self.hidden:
			self.hidden = True
			for frame in self.labelsandframes:
				frame[0].grid_remove()
	#method which unhides the row unless it is already showing
	def showrow(self):
		if self.hidden:
			self.hidden = False
			for frame in self.labelsandframes:
				frame[0].grid(row=self.row)
	#method for returning the data stored in the row as a dict
	def getdata(self):
		return self.data
class Schema:
	def __init__(self, fileloc):
		self.schema = self.__loadschema(fileloc)
		self.flatkeys = self.__genflatkeys()
	#method to load the schema from file into a dict
	def __loadschema(self, fileloc):
		if fileloc:
			with open(fileloc) as file:
				return json.load(file)
	#method that returns the schema dict object
	def getschema(self):
		return self.schema.copy()
	def __genflatkeys(self):
		flatfulllist = flattendict(self.schema.copy())
		flatmixeddict = {}
		for attr in flatfulllist:
			flatmixeddict[str(attr[0])] = attr[0][len(attr[0])-1]
		return flatmixeddict
	def getkeys(self, full):
		if full:
			indexlist = list(self.flatkeys.keys())
			for i, index in enumerate(indexlist):
				indexlist[i] = ast.literal_eval(index)
			return indexlist
		else:
			return list(self.flatkeys.values())
	
#class for handling data import, export and control
class DataManager:	
	#constructor
	def __init__(self, schemaLoc):
		self.schemaloc = schemaLoc
		self.changed = False
		self.alldata = []
		self.schema = Schema(schemaLoc)		
		self.fileheaders = {}
		self.sortattr = []
	#method returning a bool specifiying if the data has been changed
	def is_changed(self):
		return self.changed
	#method for loading files
	def loadfile(self):
		#get the current dir of the script and make that the file dialog init loc
		filename = askopenfilename(initialdir=os.path.dirname(os.path.realpath(__file__)))
		#if file selected - load it
		if filename:
			with open(filename) as file:
				readfile = json.load(file)
			#retain header data
			for header in readfile:
				if header != 'features':
					self.fileheaders[header] = readfile[header]
			#for each feature (data point) create a row obj
			for feature in readfile['features']:
				self.alldata.append(DataRow(self, feature, len(self.alldata)))
		return self.alldata
	#method for sorting data by a specified attribute
	def sort(self, userinput):
		#retrieve the index from the selected optionmenu option
		#needs to be evaled from string to tuple, then parsed into a list
		if regexcheck(userinput, '\\(.+\\)$'):
			self.sortattr = list(ast.literal_eval(userinput))
		else:
			self.sortattr = [userinput]
		#get a copy of the data sorted using the custom comparison specifed
		newlist = sorted(self.alldata, key=functools.cmp_to_key(self.__sortcmp))
		#for each data item, update its row
		for i, item in enumerate(newlist, 1):
			item.setrow(i)
	#method for saving the edited data
	def savefile(self):
		#if nothing has been changed, dont bother saving
		if not self.changed:
			return
		#get the current dir of the script and make that the file dialog init loc
		filename = asksaveasfilename(initialdir=os.path.dirname(os.path.realpath(__file__)))
		#if file selected - load it
		if filename:
			#get headers
			data = self.fileheaders
			#retrieve each row's feature data and put it in an array
			features = []
			for item in self.alldata:
				features.append(item.getdata())
			#add the feature array to the data var for writing
			data['features'] = features
			#open the specified file and dump the json to it
			with open(filename, 'w') as file:
				json.dump(data, file)
			self.changed = False
	#method for custom comparisons whilst sorting data
	def __sortcmp(self, x, y):
		#get the two values in the data using an array as index
		x = getdictitemfromarrkey(x.getdata(), self.sortattr)
		y = getdictitemfromarrkey(y.getdata(), self.sortattr)
		#basically assume None is -inf in all comparisons and return according values
		if x == y:
			return 0
		if x is None:
			return -1
		if y is None:
			return 1
		if x < y:
			return -1
		else:
			return 1
	#method for deleting an element from the data
	def delrec(self, index):
		self.alldata.pop(index)
		self.changed = True	
	#method for updating an element from the data
	def updaterec(self):
		self.changed = True	
	#method for adding a new element to the data
	def addrec(self, row):
		newindex = len(self.alldata)
		newrow = DataRow(self, row, len(self.alldata))
		self.alldata.append(newrow)
		self.changed = True
		return [newindex, newrow]
	#method for getting keys from schema which dont point to dictionaries
	def getschema(self):
		return self.schema.getschema()
	#method fro getting list of all rows
	def getalldata(self):
		return self.alldata
	#method for returning a list of all schema keys which dont point to dicts
	def getkeys(self):
		return self.schema.getkeys(True)
		#return self.schemakeys
	#method which returns the column in which the specified data index should appear
	def getcolfromindex(self, index):
		return self.schema.getkeys(True).index(index)
	#method for getting all headers from the schema
	def getheaders(self):
		fields = self.schema.getkeys(False)
		fields.append('Edit?')
		fields.append('Delete?')
		return fields
	#method which hides all rows except the ones specified
	def showrowsonly(self, rows):
		if not rows is None:
			for row in self.alldata:
				if row in rows:
					row.showrow()
				else:
					row.hiderow()
		else:
			for row in self.alldata:
				row.showrow()
#a class manging data input
class DataInputBox:
	#constructor
	def __init__(self, lmda, data, schema, dm):
		self.datamanager = dm
		self.entries = []
		self.row_no = 0
		self.schema = schema
		self.dataoriginal = self.__cleardict1andmergedict2(copy.deepcopy(schema), data)

		self.top = top = TKI.Toplevel()

		masterframe = TKI.Frame(top)
		masterframe.pack()
		
		canvas = TKI.Canvas(masterframe)		
		canvas.pack(fill='both', expand=True)

		scrframe = VerticalScrolledFrame(canvas)
		scrframe.pack(side='top', fill='both', expand=True)
		dataframe = TKI.Frame(scrframe.interior, bg="#000000")
		dataframe.pack()

		self.__unpackdict(self.dataoriginal, dataframe, [])
		
		TKI.Button(dataframe, text="Update", command=lmda).grid(row=self.row_no, sticky="W"+"E")

		#force take focus
		self.top.grab_set()
		self.top.lift()
		self.top.focus_force()
	#method which clears values from dict1 replacing them with matching vals from dict2 if they exist
	def __cleardict1andmergedict2(self, dict1, dict2, index=[]):
		for key, val in dict1.items():
			newindex = index.copy()
			newindex.append(key)
			if isinstance(val, dict):
				self.__cleardict1andmergedict2(dict1[key], dict2, newindex)
			else:
				dict2elem = getdictitemfromarrkey(dict2, newindex)
				if dict2elem:
					dict1[key] = dict2elem
				else:
					dict1[key] = ""
		return dict1
	#
	def __unpackdict(self, dictionary, parent, index):
		for key, val in dictionary.items():
			newindex = index.copy()
			newindex.append(key)
			if isinstance(val, dict):
				self.__createrow([key, val], parent, len(index), True)
				self.row_no += 1
				self.__unpackdict(val, parent, newindex)
			else:
				self.entries.append([newindex, self.__createrow([key, val], parent, len(index))])
				self.row_no += 1		
	#method for creating a row in the input dialog
	def __createrow(self, rowdata, parent, dictdepth=0, textonly=False):
		row = TKI.Frame(parent)
		for _ in range(0, dictdepth):
			rowdata[0] = "\t" + rowdata[0]
		TKI.Label(row, text=rowdata[0]).pack(side="left")
		row.grid(row=self.row_no, sticky="W"+"E")
		if not textonly:
			entry = TKI.Entry(row)
			entry.insert(0, str(rowdata[1]))
			entry.pack(side="left", fill='both', expand=True)
			return entry
	#method which gets the contents of the entry boxes 
	#returns them in an array with a boolean value specifying if the values have changed
	def getinputs(self):
		datanew = self.dataoriginal.copy()
		updated = False
		for entry in self.entries:
			if self.__checkvalid(entry[0], entry[1].get()):
				if self.__compareandsetinputs(datanew, entry[0].copy(), entry[1].get()):
					updated = True
			else:
				failedregex = getdictitemfromarrkey(self.schema, entry[0])
				messagebox.showerror("Invalid Input", "Input: '" + entry[1].get()
					+ "' does not fulfill the required regex: '" + str(failedregex) + "'")
				return None
		return [updated, datanew]
	#method which checks if user input fits regex
	def __checkvalid(self, index, val):
		schemaitem = getdictitemfromarrkey(self.schema, index)
		if schemaitem:
			return regexcheck(val, schemaitem)
		else:
			print("ERROR FINDING REGEX")
			return False
	#method which takes a dictionary, index and value, 
	#if the value at the index is the same as the passed value, return true, 
	#else update the value in the dictionary and return false
	def __compareandsetinputs(self, dictionary, index, newval):
		oldval = getdictitemfromarrkey(dictionary, index)
		#if old val is a str or regex indicates a int or array then eval
		schemaitem = getdictitemfromarrkey(self.schema, index)
		if (not isinstance(oldval, str)) or self.__matchregexintandlist(schemaitem):
			newval = ast.literal_eval(newval)
		#if no update has occured, then return False
		if oldval == newval:
			return False
		else:
			setdictitemfromarrkey(dictionary, index, newval)
			return True
	#method which returns true if the regex param matches a generic regex for list or int
	def __matchregexintandlist(self, regex):
		#match generic array
		if regexcheck(regex, '\\\\\\[.+(\\\\\\,.+)*\\\\\\]\\$$'):
			return True
		#match int: \\d+$ (\\ is b/c source encoded for jsonreadin)
		return regexcheck(regex, '\\\\d\\+\\$$')
	#method to close the window
	def closewindow(self):		
		#release focus
		self.top.grab_release()
		self.top.destroy()
#class holding all select methods
class FilterMethods:
	def __init__(self, datamanager):
		self.datamanager = datamanager
		self.methodnames = ["None", "ID ref", "Duplicates", "Invalid Entires", "Oneway Links"]
		self.methods = [self.resetfilters, self.allidref, self.getduplicates, self.getinvalidentries, self.getonewaylinks]
		#method which returns string title for each filter
	def getmethodnames(self):
		return self.methodnames
	def getmethods(self):
		return self.methods
	def resetfilters(self):
		self.datamanager.showrowsonly(None)
	#method which finds all records with the specifed id in the id or linkedto fields
	def allidref(self):
		targetid = tkSimpleDialog.askinteger("Select ID", "ID:")
		if targetid:
			data = self.datamanager.getalldata()
			containsid = []
			for item in data:
				itemid = item.getdata()['properties']['id']
				if itemid == targetid:
					containsid.append(item)
				linked = item.getdata()['properties']['LinkedTo']
				if linked:
					for link in ast.literal_eval('[' + linked + ']'):
						if link == targetid:
							containsid.append(item)
			self.datamanager.showrowsonly(containsid)
	#method to find multiple records with the same id
	def getduplicates(self):
		data = self.datamanager.getalldata()
		seenindexes = {}
		returnvalues = []
		for item in data:
			itemid = item.getdata()['properties']['id']
			if not itemid in seenindexes.keys():
				seenindexes[itemid] = item
			else:
				returnvalues.append(item)
				returnvalues.append(seenindexes[itemid])
		self.datamanager.sort("('properties', 'id')")
		self.datamanager.showrowsonly(returnvalues)
	#method which returns a list of DataRow objs which fail to pass regex checks or have missing fields
	def getinvalidentries(self):
		data = self.datamanager.getalldata()
		schema = self.datamanager.getschema()
		schemakeys = self.datamanager.getkeys()
		brokenrecords = []
		for item in data:
			for key in schemakeys:
				attr = getdictitemfromarrkey(item.getdata(), key)
				if not attr is None:
					if not regexcheck(attr, getdictitemfromarrkey(schema, key)):
						brokenrecords.append(item)
						break
				else:
					brokenrecords.append(item)
					break
		self.datamanager.showrowsonly(brokenrecords)
	#method which finds one way links
	def getonewaylinks(self):
		data = self.datamanager.getalldata()
		onewaylinkarr = []
		linklist = {}
		for item in data:
			itemid = item.getdata()['properties']['id']
			linked = item.getdata()['properties']['LinkedTo']
			if linked:
				linklist[itemid] = [ast.literal_eval('[' + linked + ']'), item]
			else:
				linklist[itemid] = [list(), item]
		for itemid, linkarr in linklist.items():
			for link in linkarr[0]:
				if not itemid in linklist[link][0]:
					onewaylinkarr.append(linkarr[1])
		self.datamanager.showrowsonly(onewaylinkarr)
#method which takes a dict and list var and returns the value at the location specified
#e.g. key = [a,b] dict = {a: {b:1}} would return 1
def getdictitemfromarrkey(dictionary, key):
	if dictionary == {}:
		print("getdictitemfromarrkey was given an empty dict")
		return None
	if isinstance(key, list):
		if len(key) > 1:
			newkey = key.copy()
			return getdictitemfromarrkey(dictionary[newkey.pop(0)], newkey)
		else:
			if key[0] in dictionary:
				return dictionary[key[0]]
			else:
				return None
	else:
		print("SHOULD HAVE GIVEN ME AN ARRAY!!")
		return None
#method for setting a dict attr by index as array
#e.g. key = [a,b] dict = {a: {b:1}}, val =3 would return True and set dict to {a:{b:3}}
def setdictitemfromarrkey(dictionary, key, val):
	if dictionary == {}:
		print("setdictitemfromarrkey was given an empty dict")
		return None
	if isinstance(key, list):
		if len(key) > 1:
			newkey = key.copy()
			return setdictitemfromarrkey(dictionary[newkey.pop(0)], newkey, val)
		else:
			if key[0] in dictionary:
				dictionary[key[0]] = val
				return True
			else:
				return None
	else:
		print("SHOULD HAVE GIVEN ME AN ARRAY!!")
		return None
#method which takes  a dict and reurns a flattened dict, with str(index) as key and the val as val
def flattendict(dictionary, incldictonlykeys=False, index=[]):
	unpackedict = []
	for key, val in dictionary.items():
		newindex = index.copy()
		newindex.append(key)
		if isinstance(val, dict):
			if incldictonlykeys:
				unpackedict.append([newindex, None])
			unpackedict = unpackedict + flattendict(dictionary[key], incldictonlykeys, newindex)
		else:
			unpackedict.append([newindex, val])
	return unpackedict
#method which checks if param val matches regex param expr
def regexcheck(val, expr):
	compiledre = re.compile(expr)
	res = compiledre.match(str(val))
	return bool(res)
ROOT = TKI.Tk()
DATAMANGER = DataManager(os.path.dirname(os.path.realpath(__file__))+"\\schema.json")
APP = Home(ROOT, DATAMANGER)
ROOT.mainloop()
