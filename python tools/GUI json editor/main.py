#this is in python 3, try that first if things dont work
import os
import json
import tkinter as TKI
from tkinter.filedialog import askopenfilename
from scrframe import VerticalScrolledFrame
from resizingCanvas import ResizingCanvas

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
		
		#create frame for holding buttons
		frame = TKI.Frame(master)
		frame.pack()
		
		#create button for selecting a file
		self.file_select = TKI.Button(frame, text="Select File", command=lambda: self.selectfile(master))
		self.file_select.pack(side='left')
		
		#create button for quitting the application
		self.button = TKI.Button(frame, text="QUIT", fg="red", command=frame.quit)
		self.button.pack(side='left')
		
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
			scrframe = VerticalScrolledFrame(tableframe)
			scrframe.pack(side='top', fill='both', expand=True)
			
			dataframe = TKI.Frame(scrframe.interior, bg = "#000000")
			
			#draw headers
			keys = self.__getheaders(data)
			self.addgridrow(dataframe, 0, keys)
			
			#draw table row by row 
			row_no = 1
			for row in data:
				obj = row.getdata()
				feat_prop = obj['properties']
				#put the data to be displayed in this array
				display_data = [feat_prop['id'], feat_prop['Label'], feat_prop['LinkedTo']]
				#TODO:stop catching blank level - abstractify and remove
				#potentially move into DataManager
				if 'Level' in feat_prop:
					display_data.append(feat_prop['Level'])
				else:
					display_data.append(-1)
				row.addgridrow(dataframe, row_no, display_data)
				row_no = row_no + 1
			dataframe.pack()
	
	def addgridrow(self, grid, row, data):
		i = 0
		for elem in data:
			elemframe = TKI.Frame(grid)
			TKI.Label(elemframe, text=elem).pack(side="left")
			elemframe.grid(sticky="W"+"E", pady = 1, padx = 1, row = row, column = i)
			i = i + 1
	
	#method for returning all headers in the properties field
	def __getheaders(self, allrows):
		keys = []
		for row in allrows:
			for key in row.getdata()['properties'].keys():
				if key not in keys:
					keys.append(key)
		keys.append('Edit?')
		keys.append('Delete?')
		return keys

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
		
	#method for creating GUI elements
	#probs shouldnt need 'text' 
	#TODO: sort that out
	def addgridrow(self, grid, row, text):
		self.row = row
		self.parent = grid
		i = 0
		for elem in text:
			self.labelsandframes.append(self.__attachlabeltoframe(i, elem))
			i = i + 1
		self.labelsandframes.append(self.__attachbuttontoframe(i, "Edit", lambda: self.__edit()))
		self.labelsandframes.append(self.__attachbuttontoframe(i + 1, "Delete", lambda: self.__del()))
	
	#method to create a label and attach it to the parent in the correct grid ref
	def __attachlabeltoframe(self, col, text):
		elem_frame = TKI.Frame(self.parent)
		lbl = TKI.Label(elem_frame, text=text)
		lbl.pack(side="left")
		elem_frame.grid(sticky="W"+"E", pady = 1, padx = 1, row = self.row, column = col)
		return [elem_frame, lbl]
	
	#method to create a button and attach it to the parent in the correct grid ref
	def __attachbuttontoframe(self, col, text, lmda):
		elemframe = TKI.Frame(self.parent)
		btn = TKI.Button(elemframe, text=text, command=lmda, bd = 0, bg = "#E1E1E1", relief = "solid")
		btn.pack()
		elemframe.grid(sticky="W"+"E", padx = 1, row = self.row, column = col)
		return [elemframe, btn]
	
	#method for event of 'edit' button click
	def __edit(self):
		self.labelsandframes[0][1]['text'] = "Test"
		self.editdialog = DataInputBox(lambda: self.__update(), self.data)
		print("TODO: implement editing")
	
	def __update(self):
		properties = self.editdialog.getinputs()
		self.datamanager.update_rec(self.index, properties)
		print("success")
	
	#method for event 'delete' button click
	def __del(self):
		for label in self.labelsandframes:
			label[0].destroy()
		self.datamanager.delRec(self.index)
		self.data = {}
	
	def getdata(self):
		return self.data

#class for handling data import, export and control
class DataManager:
	
	#methods TODO:
	#saveFile(self)
	
	#constructor
	def __init__(self, schemaLoc):
		self.schemaloc = schemaLoc
		self.changed = False
		self.alldata = []
		self.schema = self.__loadschema()
	
	#method returning a bool specifiying if the data has been changed
	def is_changed(self):
		return self.changed
		
	#method for loading files
	def loadfile(self):
		#TODO: undo this
		filename = 'C:\\Users\\emk1n17\\Documents\\LocalGit\\UniveristyMapNavPrototype\\testNodes.json'
		#get the current dir of the script and make that the file dialog init loc
		#filename = askopenfilename(initialdir=os.path.dirname(os.path.realpath(__file__))
		#if file selected - load it
		if filename:
			with open(filename) as file:
				readfile = json.load(file)
			#for each feature (data point) create a row obj
			for feature in readfile['features']:
				self.alldata.append(DataRow(self, feature, len(self.alldata)))
		return self.alldata
	
	#method for deleting an element from the data
	def del_rec(self, index):
		print(len(self.alldata))
		self.alldata.pop(index)
		self.changed = True
		print(len(self.alldata))
	
	#method for updating an element from the data
	def update_rec(self, index, record):
		self.alldata[index] = record
		#TODO:the actual updating
		self.changed = True
	
	#method for adding a new element to the data
	def add_rec(self, row):
		self.alldata.append(row)
		self.changed = True
	
	#method to load the schema from file into a dict
	def __loadschema(self):
		if self.schemaloc:
			with open(self.schemaloc) as file:
				self.schema = json.load(file)
			
	def getschema(self):
		return self.schema

#a class manging data input
class DataInputBox:
	#constructor
	def __init__(self, lmda, data):
		
		#canvas = ResizingCanvas(top)		
		#canvas.pack(fill = 'both', expand = True)

		top = TKI.Tk()
		masterframe = TKI.Frame(top)
		masterframe.pack()

		scrframe = VerticalScrolledFrame(masterframe)
		scrframe.pack(side='top', fill='both', expand=True)
		dataframe = TKI.Frame(scrframe.interior, bg = "#000000")
		dataframe.pack()
		
		self.entries = []
		self.row_no = 0		
		self.__unpackdict(data, dataframe, [])
		
		TKI.Button(dataframe, text="Update", command=lmda).grid(row = self.row_no, sticky="W"+"E")
	
	def __unpackdict(self, dictionary, parent, index):
		for key, val in dictionary.items():
			if isinstance(val, dict):
				self.__createrow([key, val], parent, len(index), True)
				self.row_no += 1
				newindex = index.copy()
				newindex.append(key)
				self.__unpackdict(val, parent, newindex)
			else:
				self.entries.append([index], self.__createrow([key, val], parent, len(index)))
				self.row_no += 1
		
	#method for creating a row in the input dialog
	def __createrow(self, rowdata, parent, dictdepth = 0, textonly = False):
		row = TKI.Frame(parent)
		#do a thing
		for _ in range(0, dictdepth):
			print(str(dictdepth))
			rowdata[0] = "\t" + rowdata[0]
		TKI.Label(row, text=rowdata[0]).pack(side="left")
		if not textonly:
			entry = TKI.Entry(row)
			entry.insert(0,rowdata[1])
			entry.pack(side="left", fill='both', expand=True)
			row.grid(row = self.row_no, sticky="W"+"E")
			return entry

	def getinputs(self):
		print("TODO: Implement msgBox input retrieval")
ROOT = TKI.Tk()
#my_window.grab_set()
#self.grab_release()
#self.top = tki.Toplevel()

DATAMANGER = DataManager(os.path.dirname(os.path.realpath(__file__))+"\\schema.json")
APP = Home(ROOT, DATAMANGER)
ROOT.mainloop()
