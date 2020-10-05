/* This file contains color variables which can be used in
 * actors, elements and items.
 */

export const Colors: any = {};

// Colors.race must be defined as objects {fg: <color1>, bg: <color2>}.
// See scss/_colors.scss for list of allowed colors
Colors.race = {};
Colors.race.animal = {bg: 'Brown'};
Colors.race.avianfolk = {bg: 'GreenYellow'};
Colors.race.bearfolk = {bg: 'GreenYellow'};
Colors.race.catfolk = {bg: 'GreenYellow'};
Colors.race.dark = {bg: 'Brown'};
Colors.race.dogfolk = {bg: 'GreenYellow'};
Colors.race.dwarven = {fg: 'White', bg: 'Brown'};
Colors.race.goblin = {bg: 'GreenYellow'};
Colors.race.human = {bg: 'Brown'};
Colors.race.hyrkhian = {bg: 'Brown'};
Colors.race.hyrm = {bg: 'Brown'};
Colors.race.spirit = {bg: 'White'};
Colors.race.undead = {bg: 'Black'};
Colors.race.wildling = {bg: 'Brown'};
Colors.race.wolfclan = {bg: 'Brown'};

// Role colors must be defined as strings, and given to items/actors as
// colorfg: Colors.role.archer, for example
Colors.role = {};
Colors.role.archer = 'Yellow';
Colors.role.berserker = 'Pink';
Colors.role.commander = 'Yellow';
Colors.role.elite = 'Cyan';
Colors.role.fighter = 'Blue';
Colors.role.king = 'Red';
Colors.role.mage = 'Purple';
Colors.role.slinger = 'Purple';

type TRgb = [number, number, number];

interface ColorEntry {
    hex: string;
    name: string;
    rgb: TRgb;
}

// Hexrgb: {'hex':'Hex rgb','name':'Color name','rgb':[null,null,null]},
// Color name: {'hex':'Hex rgb','name':'Color name','rgb':[null,null,null]},
export const ColorMap: {[key: string]: ColorEntry} = {
    '#000000':{'hex':'#000000','name':'black','rgb':[0,0,0]},
    'black':{'hex':'#000000','name':'black','rgb':[0,0,0]},
    '#C0C0C0':{'hex':'#C0C0C0','name':'silver','rgb':[192,192,192]},
    'silver':{'hex':'#C0C0C0','name':'silver','rgb':[192,192,192]},
    '#808080':{'hex':'#808080','name':'grey','rgb':[128,128,128]},
    'gray':{'hex':'#808080','name':'gray','rgb':[128,128,128]},
    '#FFFFFF':{'hex':'#FFFFFF','name':'white','rgb':[255,255,255]},
    'white':{'hex':'#FFFFFF','name':'white','rgb':[255,255,255]},
    '#800000':{'hex':'#800000','name':'maroon','rgb':[128,0,0]},
    'maroon':{'hex':'#800000','name':'maroon','rgb':[128,0,0]},
    '#FF0000':{'hex':'#FF0000','name':'red','rgb':[255,0,0]},
    'red':{'hex':'#FF0000','name':'red','rgb':[255,0,0]},
    '#800080':{'hex':'#800080','name':'purple','rgb':[128,0,128]},
    'purple':{'hex':'#800080','name':'purple','rgb':[128,0,128]},
    '#FF00FF':{'hex':'#FF00FF','name':'magenta','rgb':[255,0,255]},
    'fuchsia':{'hex':'#FF00FF','name':'fuchsia','rgb':[255,0,255]},
    '#008000':{'hex':'#008000','name':'green','rgb':[0,128,0]},
    'green':{'hex':'#008000','name':'green','rgb':[0,128,0]},
    '#00FF00':{'hex':'#00FF00','name':'lime','rgb':[0,255,0]},
    'lime':{'hex':'#00FF00','name':'lime','rgb':[0,255,0]},
    '#808000':{'hex':'#808000','name':'olive','rgb':[128,128,0]},
    'olive':{'hex':'#808000','name':'olive','rgb':[128,128,0]},
    '#FFFF00':{'hex':'#FFFF00','name':'yellow','rgb':[255,255,0]},
    'yellow':{'hex':'#FFFF00','name':'yellow','rgb':[255,255,0]},
    '#000080':{'hex':'#000080','name':'navy','rgb':[0,0,128]},
    'navy':{'hex':'#000080','name':'navy','rgb':[0,0,128]},
    '#0000FF':{'hex':'#0000FF','name':'blue','rgb':[0,0,255]},
    'blue':{'hex':'#0000FF','name':'blue','rgb':[0,0,255]},
    '#008080':{'hex':'#008080','name':'teal','rgb':[0,128,128]},
    'teal':{'hex':'#008080','name':'teal','rgb':[0,128,128]},
    '#00FFFF':{'hex':'#00FFFF','name':'cyan','rgb':[0,255,255]},
    'aqua':{'hex':'#00FFFF','name':'aqua','rgb':[0,255,255]},
    '#F0F8FF':{'hex':'#F0F8FF','name':'aliceblue','rgb':[240,248,255]},
    'aliceblue':{'hex':'#F0F8FF','name':'aliceblue','rgb':[240,248,255]},
    '#FAEBD7':{'hex':'#FAEBD7','name':'antiquewhite','rgb':[250,235,215]},
    'antiquewhite':{'hex':'#FAEBD7','name':'antiquewhite','rgb':[250,235,215]},
    '#7FFFD4':{'hex':'#7FFFD4','name':'aquamarine','rgb':[127,255,212]},
    'aquamarine':{'hex':'#7FFFD4','name':'aquamarine','rgb':[127,255,212]},
    '#F0FFFF':{'hex':'#F0FFFF','name':'azure','rgb':[240,255,255]},
    'azure':{'hex':'#F0FFFF','name':'azure','rgb':[240,255,255]},
    '#F5F5DC':{'hex':'#F5F5DC','name':'beige','rgb':[245,245,220]},
    'beige':{'hex':'#F5F5DC','name':'beige','rgb':[245,245,220]},
    '#FFE4C4':{'hex':'#FFE4C4','name':'bisque','rgb':[255,228,196]},
    'bisque':{'hex':'#FFE4C4','name':'bisque','rgb':[255,228,196]},
    '#FFEBCD':{'hex':'#FFEBCD','name':'blanchedalmond','rgb':[255,235,205]},
    'blanchedalmond':{'hex':'#FFEBCD','name':'blanchedalmond','rgb':[255,235,205]},
    '#8A2BE2':{'hex':'#8A2BE2','name':'blueviolet','rgb':[138,43,226]},
    'blueviolet':{'hex':'#8A2BE2','name':'blueviolet','rgb':[138,43,226]},
    '#A52A2A':{'hex':'#A52A2A','name':'brown','rgb':[165,42,42]},
    'brown':{'hex':'#A52A2A','name':'brown','rgb':[165,42,42]},
    '#DEB887':{'hex':'#DEB887','name':'burlywood','rgb':[222,184,135]},
    'burlywood':{'hex':'#DEB887','name':'burlywood','rgb':[222,184,135]},
    '#5F9EA0':{'hex':'#5F9EA0','name':'cadetblue','rgb':[95,158,160]},
    'cadetblue':{'hex':'#5F9EA0','name':'cadetblue','rgb':[95,158,160]},
    '#7FFF00':{'hex':'#7FFF00','name':'chartreuse','rgb':[127,255,0]},
    'chartreuse':{'hex':'#7FFF00','name':'chartreuse','rgb':[127,255,0]},
    '#D2691E':{'hex':'#D2691E','name':'chocolate','rgb':[210,105,30]},
    'chocolate':{'hex':'#D2691E','name':'chocolate','rgb':[210,105,30]},
    '#FF7F50':{'hex':'#FF7F50','name':'coral','rgb':[255,127,80]},
    'coral':{'hex':'#FF7F50','name':'coral','rgb':[255,127,80]},
    '#6495ED':{'hex':'#6495ED','name':'cornflowerblue','rgb':[100,149,237]},
    'cornflowerblue':{'hex':'#6495ED','name':'cornflowerblue','rgb':[100,149,237]},
    '#FFF8DC':{'hex':'#FFF8DC','name':'cornsilk','rgb':[255,248,220]},
    'cornsilk':{'hex':'#FFF8DC','name':'cornsilk','rgb':[255,248,220]},
    '#DC143C':{'hex':'#DC143C','name':'crimson','rgb':[220,20,60]},
    'crimson':{'hex':'#DC143C','name':'crimson','rgb':[220,20,60]},
    'cyan':{'hex':'#00FFFF','name':'cyan','rgb':[0,255,255]},
    '#00008B':{'hex':'#00008B','name':'darkblue','rgb':[0,0,139]},
    'darkblue':{'hex':'#00008B','name':'darkblue','rgb':[0,0,139]},
    '#008B8B':{'hex':'#008B8B','name':'darkcyan','rgb':[0,139,139]},
    'darkcyan':{'hex':'#008B8B','name':'darkcyan','rgb':[0,139,139]},
    '#B8860B':{'hex':'#B8860B','name':'darkgoldenrod','rgb':[184,134,11]},
    'darkgoldenrod':{'hex':'#B8860B','name':'darkgoldenrod','rgb':[184,134,11]},
    '#A9A9A9':{'hex':'#A9A9A9','name':'darkgrey','rgb':[169,169,169]},
    'darkgray':{'hex':'#A9A9A9','name':'darkgray','rgb':[169,169,169]},
    '#006400':{'hex':'#006400','name':'darkgreen','rgb':[0,100,0]},
    'darkgreen':{'hex':'#006400','name':'darkgreen','rgb':[0,100,0]},
    'darkgrey':{'hex':'#A9A9A9','name':'darkgrey','rgb':[169,169,169]},
    '#BDB76B':{'hex':'#BDB76B','name':'darkkhaki','rgb':[189,183,107]},
    'darkkhaki':{'hex':'#BDB76B','name':'darkkhaki','rgb':[189,183,107]},
    '#8B008B':{'hex':'#8B008B','name':'darkmagenta','rgb':[139,0,139]},
    'darkmagenta':{'hex':'#8B008B','name':'darkmagenta','rgb':[139,0,139]},
    '#556B2F':{'hex':'#556B2F','name':'darkolivegreen','rgb':[85,107,47]},
    'darkolivegreen':{'hex':'#556B2F','name':'darkolivegreen','rgb':[85,107,47]},
    '#FF8C00':{'hex':'#FF8C00','name':'darkorange','rgb':[255,140,0]},
    'darkorange':{'hex':'#FF8C00','name':'darkorange','rgb':[255,140,0]},
    '#9932CC':{'hex':'#9932CC','name':'darkorchid','rgb':[153,50,204]},
    'darkorchid':{'hex':'#9932CC','name':'darkorchid','rgb':[153,50,204]},
    '#8B0000':{'hex':'#8B0000','name':'darkred','rgb':[139,0,0]},
    'darkred':{'hex':'#8B0000','name':'darkred','rgb':[139,0,0]},
    '#E9967A':{'hex':'#E9967A','name':'darksalmon','rgb':[233,150,122]},
    'darksalmon':{'hex':'#E9967A','name':'darksalmon','rgb':[233,150,122]},
    '#8FBC8F':{'hex':'#8FBC8F','name':'darkseagreen','rgb':[143,188,143]},
    'darkseagreen':{'hex':'#8FBC8F','name':'darkseagreen','rgb':[143,188,143]},
    '#483D8B':{'hex':'#483D8B','name':'darkslateblue','rgb':[72,61,139]},
    'darkslateblue':{'hex':'#483D8B','name':'darkslateblue','rgb':[72,61,139]},
    '#2F4F4F':{'hex':'#2F4F4F','name':'darkslategrey','rgb':[47,79,79]},
    'darkslategray':{'hex':'#2F4F4F','name':'darkslategray','rgb':[47,79,79]},
    'darkslategrey':{'hex':'#2F4F4F','name':'darkslategrey','rgb':[47,79,79]},
    '#00CED1':{'hex':'#00CED1','name':'darkturquoise','rgb':[0,206,209]},
    'darkturquoise':{'hex':'#00CED1','name':'darkturquoise','rgb':[0,206,209]},
    '#9400D3':{'hex':'#9400D3','name':'darkviolet','rgb':[148,0,211]},
    'darkviolet':{'hex':'#9400D3','name':'darkviolet','rgb':[148,0,211]},
    '#FF1493':{'hex':'#FF1493','name':'deeppink','rgb':[255,20,147]},
    'deeppink':{'hex':'#FF1493','name':'deeppink','rgb':[255,20,147]},
    '#00BFFF':{'hex':'#00BFFF','name':'deepskyblue','rgb':[0,191,255]},
    'deepskyblue':{'hex':'#00BFFF','name':'deepskyblue','rgb':[0,191,255]},
    '#696969':{'hex':'#696969','name':'dimgrey','rgb':[105,105,105]},
    'dimgray':{'hex':'#696969','name':'dimgray','rgb':[105,105,105]},
    'dimgrey':{'hex':'#696969','name':'dimgrey','rgb':[105,105,105]},
    '#1E90FF':{'hex':'#1E90FF','name':'dodgerblue','rgb':[30,144,255]},
    'dodgerblue':{'hex':'#1E90FF','name':'dodgerblue','rgb':[30,144,255]},
    '#B22222':{'hex':'#B22222','name':'firebrick','rgb':[178,34,34]},
    'firebrick':{'hex':'#B22222','name':'firebrick','rgb':[178,34,34]},
    '#FFFAF0':{'hex':'#FFFAF0','name':'floralwhite','rgb':[255,250,240]},
    'floralwhite':{'hex':'#FFFAF0','name':'floralwhite','rgb':[255,250,240]},
    '#228B22':{'hex':'#228B22','name':'forestgreen','rgb':[34,139,34]},
    'forestgreen':{'hex':'#228B22','name':'forestgreen','rgb':[34,139,34]},
    '#DCDCDC':{'hex':'#DCDCDC','name':'gainsboro','rgb':[220,220,220]},
    'gainsboro':{'hex':'#DCDCDC','name':'gainsboro','rgb':[220,220,220]},
    '#F8F8FF':{'hex':'#F8F8FF','name':'ghostwhite','rgb':[248,248,255]},
    'ghostwhite':{'hex':'#F8F8FF','name':'ghostwhite','rgb':[248,248,255]},
    '#FFD700':{'hex':'#FFD700','name':'gold','rgb':[255,215,0]},
    'gold':{'hex':'#FFD700','name':'gold','rgb':[255,215,0]},
    '#DAA520':{'hex':'#DAA520','name':'goldenrod','rgb':[218,165,32]},
    'goldenrod':{'hex':'#DAA520','name':'goldenrod','rgb':[218,165,32]},
    '#ADFF2F':{'hex':'#ADFF2F','name':'greenyellow','rgb':[173,255,47]},
    'greenyellow':{'hex':'#ADFF2F','name':'greenyellow','rgb':[173,255,47]},
    'grey':{'hex':'#808080','name':'grey','rgb':[128,128,128]},
    '#F0FFF0':{'hex':'#F0FFF0','name':'honeydew','rgb':[240,255,240]},
    'honeydew':{'hex':'#F0FFF0','name':'honeydew','rgb':[240,255,240]},
    '#FF69B4':{'hex':'#FF69B4','name':'hotpink','rgb':[255,105,180]},
    'hotpink':{'hex':'#FF69B4','name':'hotpink','rgb':[255,105,180]},
    '#CD5C5C':{'hex':'#CD5C5C','name':'indianred','rgb':[205,92,92]},
    'indianred':{'hex':'#CD5C5C','name':'indianred','rgb':[205,92,92]},
    '#4B0082':{'hex':'#4B0082','name':'indigo','rgb':[75,0,130]},
    'indigo':{'hex':'#4B0082','name':'indigo','rgb':[75,0,130]},
    '#FFFFF0':{'hex':'#FFFFF0','name':'ivory','rgb':[255,255,240]},
    'ivory':{'hex':'#FFFFF0','name':'ivory','rgb':[255,255,240]},
    '#F0E68C':{'hex':'#F0E68C','name':'khaki','rgb':[240,230,140]},
    'khaki':{'hex':'#F0E68C','name':'khaki','rgb':[240,230,140]},
    '#E6E6FA':{'hex':'#E6E6FA','name':'lavender','rgb':[230,230,250]},
    'lavender':{'hex':'#E6E6FA','name':'lavender','rgb':[230,230,250]},
    '#FFF0F5':{'hex':'#FFF0F5','name':'lavenderblush','rgb':[255,240,245]},
    'lavenderblush':{'hex':'#FFF0F5','name':'lavenderblush','rgb':[255,240,245]},
    '#7CFC00':{'hex':'#7CFC00','name':'lawngreen','rgb':[124,252,0]},
    'lawngreen':{'hex':'#7CFC00','name':'lawngreen','rgb':[124,252,0]},
    '#FFFACD':{'hex':'#FFFACD','name':'lemonchiffon','rgb':[255,250,205]},
    'lemonchiffon':{'hex':'#FFFACD','name':'lemonchiffon','rgb':[255,250,205]},
    '#ADD8E6':{'hex':'#ADD8E6','name':'lightblue','rgb':[173,216,230]},
    'lightblue':{'hex':'#ADD8E6','name':'lightblue','rgb':[173,216,230]},
    '#F08080':{'hex':'#F08080','name':'lightcoral','rgb':[240,128,128]},
    'lightcoral':{'hex':'#F08080','name':'lightcoral','rgb':[240,128,128]},
    '#E0FFFF':{'hex':'#E0FFFF','name':'lightcyan','rgb':[224,255,255]},
    'lightcyan':{'hex':'#E0FFFF','name':'lightcyan','rgb':[224,255,255]},
    '#FAFAD2':{'hex':'#FAFAD2','name':'lightgoldenrodyellow','rgb':[250,250,210]},
    'lightgoldenrodyellow':{'hex':'#FAFAD2','name':'lightgoldenrodyellow','rgb':[250,250,210]},
    '#D3D3D3':{'hex':'#D3D3D3','name':'lightgrey','rgb':[211,211,211]},
    'lightgray':{'hex':'#D3D3D3','name':'lightgray','rgb':[211,211,211]},
    '#90EE90':{'hex':'#90EE90','name':'lightgreen','rgb':[144,238,144]},
    'lightgreen':{'hex':'#90EE90','name':'lightgreen','rgb':[144,238,144]},
    'lightgrey':{'hex':'#D3D3D3','name':'lightgrey','rgb':[211,211,211]},
    '#FFB6C1':{'hex':'#FFB6C1','name':'lightpink','rgb':[255,182,193]},
    'lightpink':{'hex':'#FFB6C1','name':'lightpink','rgb':[255,182,193]},
    '#FFA07A':{'hex':'#FFA07A','name':'lightsalmon','rgb':[255,160,122]},
    'lightsalmon':{'hex':'#FFA07A','name':'lightsalmon','rgb':[255,160,122]},
    '#20B2AA':{'hex':'#20B2AA','name':'lightseagreen','rgb':[32,178,170]},
    'lightseagreen':{'hex':'#20B2AA','name':'lightseagreen','rgb':[32,178,170]},
    '#87CEFA':{'hex':'#87CEFA','name':'lightskyblue','rgb':[135,206,250]},
    'lightskyblue':{'hex':'#87CEFA','name':'lightskyblue','rgb':[135,206,250]},
    '#778899':{'hex':'#778899','name':'lightslategrey','rgb':[119,136,153]},
    'lightslategray':{'hex':'#778899','name':'lightslategray','rgb':[119,136,153]},
    'lightslategrey':{'hex':'#778899','name':'lightslategrey','rgb':[119,136,153]},
    '#B0C4DE':{'hex':'#B0C4DE','name':'lightsteelblue','rgb':[176,196,222]},
    'lightsteelblue':{'hex':'#B0C4DE','name':'lightsteelblue','rgb':[176,196,222]},
    '#FFFFE0':{'hex':'#FFFFE0','name':'lightyellow','rgb':[255,255,224]},
    'lightyellow':{'hex':'#FFFFE0','name':'lightyellow','rgb':[255,255,224]},
    '#32CD32':{'hex':'#32CD32','name':'limegreen','rgb':[50,205,50]},
    'limegreen':{'hex':'#32CD32','name':'limegreen','rgb':[50,205,50]},
    '#FAF0E6':{'hex':'#FAF0E6','name':'linen','rgb':[250,240,230]},
    'linen':{'hex':'#FAF0E6','name':'linen','rgb':[250,240,230]},
    'magenta':{'hex':'#FF00FF','name':'magenta','rgb':[255,0,255]},
    '#66CDAA':{'hex':'#66CDAA','name':'mediumaquamarine','rgb':[102,205,170]},
    'mediumaquamarine':{'hex':'#66CDAA','name':'mediumaquamarine','rgb':[102,205,170]},
    '#0000CD':{'hex':'#0000CD','name':'mediumblue','rgb':[0,0,205]},
    'mediumblue':{'hex':'#0000CD','name':'mediumblue','rgb':[0,0,205]},
    '#BA55D3':{'hex':'#BA55D3','name':'mediumorchid','rgb':[186,85,211]},
    'mediumorchid':{'hex':'#BA55D3','name':'mediumorchid','rgb':[186,85,211]},
    '#9370DB':{'hex':'#9370DB','name':'mediumpurple','rgb':[147,112,219]},
    'mediumpurple':{'hex':'#9370DB','name':'mediumpurple','rgb':[147,112,219]},
    '#3CB371':{'hex':'#3CB371','name':'mediumseagreen','rgb':[60,179,113]},
    'mediumseagreen':{'hex':'#3CB371','name':'mediumseagreen','rgb':[60,179,113]},
    '#7B68EE':{'hex':'#7B68EE','name':'mediumslateblue','rgb':[123,104,238]},
    'mediumslateblue':{'hex':'#7B68EE','name':'mediumslateblue','rgb':[123,104,238]},
    '#00FA9A':{'hex':'#00FA9A','name':'mediumspringgreen','rgb':[0,250,154]},
    'mediumspringgreen':{'hex':'#00FA9A','name':'mediumspringgreen','rgb':[0,250,154]},
    '#48D1CC':{'hex':'#48D1CC','name':'mediumturquoise','rgb':[72,209,204]},
    'mediumturquoise':{'hex':'#48D1CC','name':'mediumturquoise','rgb':[72,209,204]},
    '#C71585':{'hex':'#C71585','name':'mediumvioletred','rgb':[199,21,133]},
    'mediumvioletred':{'hex':'#C71585','name':'mediumvioletred','rgb':[199,21,133]},
    '#191970':{'hex':'#191970','name':'midnightblue','rgb':[25,25,112]},
    'midnightblue':{'hex':'#191970','name':'midnightblue','rgb':[25,25,112]},
    '#F5FFFA':{'hex':'#F5FFFA','name':'mintcream','rgb':[245,255,250]},
    'mintcream':{'hex':'#F5FFFA','name':'mintcream','rgb':[245,255,250]},
    '#FFE4E1':{'hex':'#FFE4E1','name':'mistyrose','rgb':[255,228,225]},
    'mistyrose':{'hex':'#FFE4E1','name':'mistyrose','rgb':[255,228,225]},
    '#FFE4B5':{'hex':'#FFE4B5','name':'moccasin','rgb':[255,228,181]},
    'moccasin':{'hex':'#FFE4B5','name':'moccasin','rgb':[255,228,181]},
    '#FFDEAD':{'hex':'#FFDEAD','name':'navajowhite','rgb':[255,222,173]},
    'navajowhite':{'hex':'#FFDEAD','name':'navajowhite','rgb':[255,222,173]},
    '#FDF5E6':{'hex':'#FDF5E6','name':'oldlace','rgb':[253,245,230]},
    'oldlace':{'hex':'#FDF5E6','name':'oldlace','rgb':[253,245,230]},
    '#6B8E23':{'hex':'#6B8E23','name':'olivedrab','rgb':[107,142,35]},
    'olivedrab':{'hex':'#6B8E23','name':'olivedrab','rgb':[107,142,35]},
    '#FFA500':{'hex':'#FFA500','name':'orange','rgb':[255,165,0]},
    'orange':{'hex':'#FFA500','name':'orange','rgb':[255,165,0]},
    '#FF4500':{'hex':'#FF4500','name':'orangered','rgb':[255,69,0]},
    'orangered':{'hex':'#FF4500','name':'orangered','rgb':[255,69,0]},
    '#DA70D6':{'hex':'#DA70D6','name':'orchid','rgb':[218,112,214]},
    'orchid':{'hex':'#DA70D6','name':'orchid','rgb':[218,112,214]},
    '#EEE8AA':{'hex':'#EEE8AA','name':'palegoldenrod','rgb':[238,232,170]},
    'palegoldenrod':{'hex':'#EEE8AA','name':'palegoldenrod','rgb':[238,232,170]},
    '#98FB98':{'hex':'#98FB98','name':'palegreen','rgb':[152,251,152]},
    'palegreen':{'hex':'#98FB98','name':'palegreen','rgb':[152,251,152]},
    '#AFEEEE':{'hex':'#AFEEEE','name':'paleturquoise','rgb':[175,238,238]},
    'paleturquoise':{'hex':'#AFEEEE','name':'paleturquoise','rgb':[175,238,238]},
    '#DB7093':{'hex':'#DB7093','name':'palevioletred','rgb':[219,112,147]},
    'palevioletred':{'hex':'#DB7093','name':'palevioletred','rgb':[219,112,147]},
    '#FFEFD5':{'hex':'#FFEFD5','name':'papayawhip','rgb':[255,239,213]},
    'papayawhip':{'hex':'#FFEFD5','name':'papayawhip','rgb':[255,239,213]},
    '#FFDAB9':{'hex':'#FFDAB9','name':'peachpuff','rgb':[255,218,185]},
    'peachpuff':{'hex':'#FFDAB9','name':'peachpuff','rgb':[255,218,185]},
    '#CD853F':{'hex':'#CD853F','name':'peru','rgb':[205,133,63]},
    'peru':{'hex':'#CD853F','name':'peru','rgb':[205,133,63]},
    '#FFC0CB':{'hex':'#FFC0CB','name':'pink','rgb':[255,192,203]},
    'pink':{'hex':'#FFC0CB','name':'pink','rgb':[255,192,203]},
    '#DDA0DD':{'hex':'#DDA0DD','name':'plum','rgb':[221,160,221]},
    'plum':{'hex':'#DDA0DD','name':'plum','rgb':[221,160,221]},
    '#B0E0E6':{'hex':'#B0E0E6','name':'powderblue','rgb':[176,224,230]},
    'powderblue':{'hex':'#B0E0E6','name':'powderblue','rgb':[176,224,230]},
    '#BC8F8F':{'hex':'#BC8F8F','name':'rosybrown','rgb':[188,143,143]},
    'rosybrown':{'hex':'#BC8F8F','name':'rosybrown','rgb':[188,143,143]},
    '#4169E1':{'hex':'#4169E1','name':'royalblue','rgb':[65,105,225]},
    'royalblue':{'hex':'#4169E1','name':'royalblue','rgb':[65,105,225]},
    '#8B4513':{'hex':'#8B4513','name':'saddlebrown','rgb':[139,69,19]},
    'saddlebrown':{'hex':'#8B4513','name':'saddlebrown','rgb':[139,69,19]},
    '#FA8072':{'hex':'#FA8072','name':'salmon','rgb':[250,128,114]},
    'salmon':{'hex':'#FA8072','name':'salmon','rgb':[250,128,114]},
    '#F4A460':{'hex':'#F4A460','name':'sandybrown','rgb':[244,164,96]},
    'sandybrown':{'hex':'#F4A460','name':'sandybrown','rgb':[244,164,96]},
    '#2E8B57':{'hex':'#2E8B57','name':'seagreen','rgb':[46,139,87]},
    'seagreen':{'hex':'#2E8B57','name':'seagreen','rgb':[46,139,87]},
    '#FFF5EE':{'hex':'#FFF5EE','name':'seashell','rgb':[255,245,238]},
    'seashell':{'hex':'#FFF5EE','name':'seashell','rgb':[255,245,238]},
    '#A0522D':{'hex':'#A0522D','name':'sienna','rgb':[160,82,45]},
    'sienna':{'hex':'#A0522D','name':'sienna','rgb':[160,82,45]},
    '#87CEEB':{'hex':'#87CEEB','name':'skyblue','rgb':[135,206,235]},
    'skyblue':{'hex':'#87CEEB','name':'skyblue','rgb':[135,206,235]},
    '#6A5ACD':{'hex':'#6A5ACD','name':'slateblue','rgb':[106,90,205]},
    'slateblue':{'hex':'#6A5ACD','name':'slateblue','rgb':[106,90,205]},
    '#708090':{'hex':'#708090','name':'slategrey','rgb':[112,128,144]},
    'slategray':{'hex':'#708090','name':'slategray','rgb':[112,128,144]},
    'slategrey':{'hex':'#708090','name':'slategrey','rgb':[112,128,144]},
    '#FFFAFA':{'hex':'#FFFAFA','name':'snow','rgb':[255,250,250]},
    'snow':{'hex':'#FFFAFA','name':'snow','rgb':[255,250,250]},
    '#00FF7F':{'hex':'#00FF7F','name':'springgreen','rgb':[0,255,127]},
    'springgreen':{'hex':'#00FF7F','name':'springgreen','rgb':[0,255,127]},
    '#4682B4':{'hex':'#4682B4','name':'steelblue','rgb':[70,130,180]},
    'steelblue':{'hex':'#4682B4','name':'steelblue','rgb':[70,130,180]},
    '#D2B48C':{'hex':'#D2B48C','name':'tan','rgb':[210,180,140]},
    'tan':{'hex':'#D2B48C','name':'tan','rgb':[210,180,140]},
    '#D8BFD8':{'hex':'#D8BFD8','name':'thistle','rgb':[216,191,216]},
    'thistle':{'hex':'#D8BFD8','name':'thistle','rgb':[216,191,216]},
    '#FF6347':{'hex':'#FF6347','name':'tomato','rgb':[255,99,71]},
    'tomato':{'hex':'#FF6347','name':'tomato','rgb':[255,99,71]},
    '#40E0D0':{'hex':'#40E0D0','name':'turquoise','rgb':[64,224,208]},
    'turquoise':{'hex':'#40E0D0','name':'turquoise','rgb':[64,224,208]},
    '#EE82EE':{'hex':'#EE82EE','name':'violet','rgb':[238,130,238]},
    'violet':{'hex':'#EE82EE','name':'violet','rgb':[238,130,238]},
    '#F5DEB3':{'hex':'#F5DEB3','name':'wheat','rgb':[245,222,179]},
    'wheat':{'hex':'#F5DEB3','name':'wheat','rgb':[245,222,179]},
    '#F5F5F5':{'hex':'#F5F5F5','name':'whitesmoke','rgb':[245,245,245]},
    'whitesmoke':{'hex':'#F5F5F5','name':'whitesmoke','rgb':[245,245,245]},
    '#9ACD32':{'hex':'#9ACD32','name':'yellowgreen','rgb':[154,205,50]},
    'yellowgreen':{'hex':'#9ACD32','name':'yellowgreen','rgb':[154,205,50]}
};

const colorThr = 36;
export function colorsTooClose(fg, bg): boolean {
    if (fg === bg) {return true;}
    const thr = colorThr;
    const hexFg = ColorMap[fg.toLowerCase()].rgb;
    const hexBg = ColorMap[bg.toLowerCase()].rgb;
    const brightnessFg = getHsp(hexFg);
    const brightnessBg = getHsp(hexBg);
    if (Math.abs(brightnessFg - brightnessBg) < thr) {
        return true;
    }
    return false;
}

export function getNewFgColor(fg, bg): string {
    const thr = colorThr;
    const hexFg = ColorMap[fg.toLowerCase()].rgb;
    const hexBg = ColorMap[bg.toLowerCase()].rgb;
    const brightnessFg = getHsp(hexFg);
    const brightnessBg = getHsp(hexBg);
    if (Math.abs(brightnessFg - brightnessBg) < thr) {
        if (brightnessBg < 128) {return 'White';}
        return 'Black';
    }
}

// HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
function getHsp(rgb: TRgb): number {
    return Math.sqrt(
        0.299 * (rgb[0] ** 2) +
        0.587 * (rgb[1] ** 2) +
        0.114 * (rgb[2] ** 2)
    )
}

// See https://www.rapidtables.com/convert/color/rgb-to-hsv.html
function rgb2hsv(rgb: TRgb): [number, number, number] {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const cmax = Math.max(r, g, b);
    const cmin = Math.min(r, g, b);
    const delta = cmax - cmin;

    let hue = 0;
    if (r === cmax) {
        hue = 60 * (((r - b) / delta) % 6);
    }
    else if (g === cmax) {
        hue = 60 * (((b - r) / delta) + 2);
    }
    else if (b === cmax) {
        hue = 60 * (((r - g) / delta) + 4);
    }

    const sat = cmax === 0 ? 0 : delta / cmax;
    const val = cmax;
    return [hue, sat, val];
}
