#this is in python 3, try that first if things dont work
import os
import json
import ast
import re
import copy
import functools
import tkinter as TKI
import tkinter.messagebox as messagebox
from tkinter.filedialog import askopenfilename, asksaveasfilename
from scrframe import TwoDimScrolledFrame, VerticalScrolledFrame

#class for main display
class Home:
	#TODO: unmute C0111 in pylint
	"""DocString here
	Desc
	Note
	Args:
	Attributes
	"""
	#constructor
	def __init__(self, master, datamanager):
		
		self.datamanager = datamanager
		self.adddailog = None
		self.rowno = 0
		
		#create frame for holding buttons
		frame = TKI.Frame(master)
		frame.pack()
		
		#create button for selecting a file
		self.file_select = TKI.Button(frame, text="Select File", command=lambda: self.selectfile(master))
		self.file_select.pack(side='left')
		
		#create button for quitting the application
		self.button = TKI.Button(frame, text="QUIT", fg="red", command=frame.quit)
		self.button.pack(side='left')

		self.add = TKI.Button(frame, text="Add Data", command=lambda: self.__openadd())
		
		self.save = TKI.Button(frame, text="Save Data", command=lambda: self.__save())

		self.sortoption = TKI.StringVar()
		self.sortoption.set(self.datamanager.getheaders()[0])
		self.sortoptionmenu = TKI.OptionMenu(frame, self.sortoption, *self.datamanager.getkeys())

		self.sort = TKI.Button(frame, text="Sort", command=lambda: self.datamanager.sort(self.sortoption))

		test = SelectMethods(datamanager)
		self.testButton = TKI.Button(frame, text="TEST!", command=lambda:test.findduplicates())
	#method handling click on selectfile - param specifying parent of display.
	def selectfile(self, master):
		#load file
		data = self.datamanager.loadfile()
		#if loading succeeded []=false, [1]=true
		if data:

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
			self.add.pack(side='left')
			self.save.pack(side='left')
			self.sortoptionmenu.pack(side='left')
			self.sort.pack(side='left')
			self.testButton.pack(side='left')
	def addgridrow(self, grid, row, data):
		i = 0
		for elem in data:
			elemframe = TKI.Frame(grid)
			TKI.Label(elemframe, text=elem).pack(side="left")
			elemframe.grid(sticky="W"+"E", pady=1, padx=1, row=row, column=i)
			i = i + 1
	def __getkeysfromdata(self, dictioanry):
		data = []
		for key, val in dictioanry.items():
			if isinstance(val, dict):
				data = data + self.__getkeysfromdata(dictioanry[key])
			else:
				data.append(key)
		return data
	def __openadd(self):
		self.adddailog = DataInputBox(lambda: self.__add(), {}, self.datamanager.getschema(), self.datamanager)
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
		lbl = TKI.Label(elem_frame, text=str(text))
		lbl.pack(side="left")
		elem_frame.grid(sticky="W"+"E", pady=1, padx=1, row=self.row, column=col)
		return [elem_frame, lbl]
	#method to create a button and attach it to the parent in the correct grid ref
	def __attachbuttontoframe(self, col, text, lmda):
		elemframe = TKI.Frame(self.parent)
		btn = TKI.Button(elemframe, text=text, command=lmda, bd=0, bg="#E1E1E1", relief="solid")
		btn.pack()
		elemframe.grid(sticky="W"+"E", padx=1, row=self.row, column=col)
		return [elemframe, btn]
	#method for event of 'edit' button click
	def __edit(self):
		self.editdialog = DataInputBox(lambda: self.__update(), self.data, self.datamanager.getschema(), self.datamanager)
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
				#TODO: delete  old frames

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
		for frame in self.labelsandframes:
			if isinstance(row, int):
				frame[0].grid(row=row)
			else:
				frame[0].grid_remove()
		
	#method for returning the data stored in the row as a dict
	def getdata(self):
		return self.data

#class for handling data import, export and control
class DataManager:	
	#constructor
	def __init__(self, schemaLoc):
		self.schemaloc = schemaLoc
		self.changed = False
		self.alldata = []
		self.indexheaderref = {}
		self.headers = []

		self.schema = self.__loadschema()
		
		self.fileheaders = {}

		self.__genheaders(self.schema)
		self.headers.append('Edit?')
		self.headers.append('Delete?')

		self.schemakeys = []
		self.__genkeys(self.schema)

		self.sortattr = []
	#method returning a bool specifiying if the data has been changed
	def is_changed(self):
		return self.changed
	#method for loading files
	def loadfile(self):
		#filename = 'C:\\Users\\emk1n17\\Documents\\LocalGit\\UniveristyMapNavPrototype\\testNodes.json'
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
	def sort(self, attribute):
		#retrieve the index from the selected optionmenu option
		#needs to be evaled from string to tuple, then parsed into a list
		userinput = attribute.get()
		compiledre = re.compile('\(.+\)$')
		res = compiledre.match(userinput)
		if res:
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
		x = getdictionaryitemwitharraykey(x.getdata(), self.sortattr)
		y = getdictionaryitemwitharraykey(y.getdata(), self.sortattr)
		#basically assume None is -inf in all comparisons and return according values
		if x == y == None:
			return 0
		if x == None:
			return -1
		if y == None:
			return 1
		if type(x) != type(y):
			newxy = self.__derterminenonstrtype(x, y)
			x = newxy[0]
			y = newxy[1]
		if x < y:
			return -1
		else:
			return 1
	#method which takes 2 args, one of str type and the other of type int or list
	#returns an array of two ints or lists, with the str param parsed to the type of the other
	def __derterminenonstrtype(self, x, y):
		if isinstance(x, str):
			if isinstance(y, int):
				return (int(x), y)
			elif isinstance(y, list):
				return (list(x), y)
			else:
				print("Error: Unrecognised Type")
		elif isinstance(y, str):
			if isinstance(x, int):
				return (x, int(y))
			elif isinstance(x, list):
				return (x, list(y))
			else:
				print("Unrecognised Type")
		else:
			print("Error: neither arg is str type")
		return None
	#method for deleting an element from the data
	def delrec(self, index):
		self.alldata.pop(index)
		self.changed = True	
	#method for updating an element from the data
	def updaterec(self):
		self.changed = True	
	#method for adding a new element to the data
	def addrec(self, row):
		expectedindex = len(self.alldata)
		newrow = DataRow(self, row, len(self.alldata))
		self.alldata.append(newrow)
		self.changed = True
		actaulindex = self.alldata.index(newrow)
		if actaulindex != expectedindex:
			print("PANICPANICPANICPANIC!!!!")
		return [actaulindex, newrow]
	
	#method to load the schema from file into a dict
	def __loadschema(self):
		if self.schemaloc:
			with open(self.schemaloc) as file:
				return json.load(file)
	#method for generating all headers from the schema
	def __genheaders(self, schema, index=[]):
		for key, val in schema.items():
			if isinstance(val, dict):
				newindex = index.copy()
				newindex.append(key)
				self.__genheaders(schema[key], newindex)
			else:
				self.headers.append(key)
				self.indexheaderref[str(index + [key])] = len(self.headers) - 1
	#method for getting all headers from the schema
	def getheaders(self):
		return self.headers
	#method which returns the column in which the specified data index should appear
	def getcolfromindex(self, index):
		return self.indexheaderref[str(index)]
	#method for getting keys from schema which dont point to dictionaries
	def getschema(self):
		return self.schema
	#method for recursively generating keys from schema where they dont point to dictionaries
	def __genkeys(self, dictionary, indexes=[]):
		#for each item pair at this level
		for key, val in dictionary.items():
			#clone the index and append the current key
			newindex = indexes.copy()
			newindex.append(key)
			#check if the key is pointing to a dict, if so recurse, else append the key to the list of keys
			if isinstance(val, dict):
				self.__genkeys(dictionary[key], newindex)
			else:
				self.schemakeys.append(newindex)
	#method for returning a list of all schema keys which dont point to dicts
	def getkeys(self):
		return self.schemakeys
	#method fro getting list of all rows
	def getalldata(self):
		return self.alldata
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
	#method which clears values from dict1 and replaces them with matching vals from dict2 if they exist
	def __cleardict1andmergedict2(self, dict1, dict2, index=[]):
		for key, val in dict1.items():
			newindex = index.copy()
			newindex.append(key)
			if isinstance(val, dict):
				self.__cleardict1andmergedict2(dict1[key], dict2, newindex)
			else:
				dict2elem = getdictionaryitemwitharraykey(dict2, newindex)
				if dict2elem:
					dict1[key] = dict2elem
				else:
					dict1[key] = ""
		return dict1
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
		#do a thing
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
				if self.__compareandsetinputs(datanew, entry[0].copy(), entry[1].get(), entry[0].copy()):
					updated = True
			else:
				failedregex = getdictionaryitemwitharraykey(self.schema, entry[0])
				messagebox.showerror("Invalid Input", "Input: '" + entry[1].get()
				+ "' does not fulfill the required regex: '" + str(failedregex) + "'")
				return None
		return [updated, datanew]
	#method which checks if user input fits regex
	def __checkvalid(self, index, val):
		schemaitem = getdictionaryitemwitharraykey(self.schema, index)
		if schemaitem:
			compiledre = re.compile(schemaitem)
			res = compiledre.match(val)
			return bool(res)
		else:
			print("ERROR FINDING REGEX")
			return False
	#method which takes a dictionary, index and value, 
	#if the value at the index is the same as the passed value, return true, 
	#else update the value in the dictionary and return false
	def __compareandsetinputs(self, dictionary, index, val, originalindex):
		if len(index) > 1:
			top = index.pop(0)
			return self.__compareandsetinputs(dictionary[top], index, val, originalindex)
		else:
			#if editing, check current property's type, if not string, then eval input
			schemaitem = getdictionaryitemwitharraykey(self.schema, originalindex)
			if (not isinstance(dictionary[index[0]], str)) or self.__matchregexintandlist(schemaitem):
				val = ast.literal_eval(val)
			if dictionary[index[0]] == val:
				return False
			else:
				dictionary[index[0]] = val
				return True
	#method which returns true if the regex param matches a generic regex for list or int
	def __matchregexintandlist(self, regex):
		#match generic array
		compiledre = re.compile('\\\\\\[.+(\\\\\\,.+)*\\\\\\]\\$$')
		res = compiledre.match(regex)
		output = bool(res)
		if output:
			return output
		#match \\d+$ (\\ is b/c encoded for jsonreadin)
		compiledre = re.compile('\\\\d\\+\\$$')
		res = compiledre.match(regex)
		return bool(res)
	#method to close the window
	def closewindow(self):		
		#release focus
		self.top.grab_release()
		self.top.destroy()
#class holding all select methods
class SelectMethods:
	def __init__(self, datamanager):
		self.datamanager = datamanager
	def allidref(self, id):
		print("TODO: implement idref")
	def onewaylinks(self):
		data = self.datamanager.getdata()
		linklist = {}
		for item in data:
			linked = item.getdata()['LinkedTo']
			#if linked:	
	def findduplicates(self):
		data = self.datamanager.getalldata()
		seenindexes = []
		returnvalues = {}
		for i, item in enumerate(data):
			id = item.getdata()['properties']['id']
			if not id in seenindexes:
				seenindexes.append(id)
			else:
				if id in returnvalues:
					returnvalues[id].append(i)
				else:
					returnvalues[id] = [seenindexes.index(id), i]
		print(returnvalues)
		return returnvalues
	def findmissingfields(self):
		print("TODO: find missing fields")
#method which takes a dict and list var and returns the value at the location specified
#e.g. key = [a,b] dict = {a: {b:1}} would return 1
def getdictionaryitemwitharraykey(dictionary, key):
	if dictionary == {}:
		print("getdictfromindexarr was given an empty dict")
		return None
	if isinstance(key, list):
		if len(key) > 1:
			newkey = key.copy()
			return getdictionaryitemwitharraykey(dictionary[newkey.pop(0)], newkey)
		else:
			if key[0] in dictionary:
				return dictionary[key[0]]
			else:
				return None
	else:
		print("SHOULD HAVE GIVEN ME AN ARRAY!!")
		return None
ROOT = TKI.Tk()
DATAMANGER = DataManager(os.path.dirname(os.path.realpath(__file__))+"\\schema.json")
APP = Home(ROOT, DATAMANGER)
ROOT.mainloop()
