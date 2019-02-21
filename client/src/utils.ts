
interface String {
    capitalize();
}

String.prototype.capitalize = String.prototype.capitalize || function() {
    return this.charAt(0).toUpperCase() + this.substring(1);
};

interface Function {
    extend(any);
}
