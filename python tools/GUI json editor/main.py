#this is in python 3, try that first if things dont work
from tkinter import *
from tkinter.filedialog import askopenfilename
from scrframe import VerticalScrolledFrame
import os
import json
import pprint

class Home:
	def __init__(self, master):

		frame = Frame(master)
		frame.pack()

		self.file_select = Button(frame, text="Select File", command=lambda: self.selectFile(master))
		self.file_select.pack(side=LEFT)
		
		self.button = Button(
			frame, text="QUIT", fg="red", command=frame.quit
		)
		self.button.pack(side=LEFT)
		
	def selectFile(self, master):
		#get the current dir of the script and make that the file dialog init loc
		dir_path = os.path.dirname(os.path.realpath(__file__))
		filename = 'C:\\Users\\emk1n17\\Documents\\LocalGit\\UniveristyMapNavPrototype\\testNodes.json'
		#TODO: undo this
		#filename = askopenfilename(initialdir=dir_path)
		if (filename):
			data = loadFile(filename)
			keys = []
			for feature in data['features']:
				for key, value in feature['properties'].items():
					if key not in keys:
						keys.append(key)
			
			keys.append('Edit')
			keys.append('Delete')
			
			tableFrame = Frame(master)
			tableFrame.pack()
			
			scrFrame = VerticalScrolledFrame(master)
			scrFrame.pack(side=LEFT, fill=BOTH, expand=TRUE)
			
			dataFrame = Frame(scrFrame.interior, bg = "#000000")
			self.addGridRow(dataFrame, 0, keys);
			for col in range(len(keys)):
				dataFrame.grid_columnconfigure(col, weight=1)
			
			row = 1
			
			for feature in data['features']:
				fProp = feature['properties']
				data = [fProp['id'], fProp['Label'], fProp['LinkedTo']]
				if 'Level' in fProp:
					data.append(fProp['Level'])
				else:
					data.append(-1)
				DataRow(data, dataFrame, row)
				row = row + 1
			dataFrame.pack()
	def addGridRow(self, grid, row, data):
		i = 0
		for elem in data:
			elemFrame = Frame(grid)
			Label(elemFrame, text=elem).pack(side="left")
			elemFrame.grid(sticky="W"+"E", pady = 1,padx = 1, row = row, column = i)
			i = i + 1
class DataRow:
	def __init__(self, data, grid, row):
		self.data = data
		self.row = row
		self.parent = grid
		self.__addGridRow()
	def __addGridRow(self):
		LabelsAndFrames = []
		i = 0
		for elem in self.data:
			LabelsAndFrames.append(self.__attachLabelToFrame(i, elem))
			i = i + 1
		LabelsAndFrames.append(self.__attachButtonToFrame(i, "Edit", lambda: self.__edit()))
		LabelsAndFrames.append(self.__attachButtonToFrame(i + 1, "Delete", lambda: self.__del()))
		self.LabelsAndFrames = LabelsAndFrames
	def __attachLabelToFrame(self, col, text):
		elemFrame = Frame(self.parent)
		l = Label(elemFrame, text=text)
		l.pack(side="left")
		elemFrame.grid(sticky="W"+"E", pady = 1, padx = 1, row = self.row, column = col)
		return [elemFrame, l]
	def __attachButtonToFrame(self, col, text, lmda):
		elemFrame = Frame(self.parent)
		b = Button(elemFrame, text=text, command=lmda, bd = 0, bg = "#E1E1E1", relief
 = "solid")
		b.pack(side="left")
		elemFrame.grid(sticky="W"+"E", padx = 1, row = self.row, column = col)
		return [elemFrame, b]
	def __edit(self):
		self.LabelsAndFrames[0][1]['text'] = "Test"
		print("TODO: implement editing")
	def __del(self):
		for label in self.LabelsAndFrames:
			label[0].destroy()
			
		print("TODO: implement deletion")
		
def loadFile(fileLoc):
	with open(fileLoc) as f:
		d = json.load(f)
	return d
	
root = Tk()
app = Home(root)
root.mainloop()